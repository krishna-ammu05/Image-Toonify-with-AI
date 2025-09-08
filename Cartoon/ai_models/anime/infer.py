#!/usr/bin/env python
import argparse
import os
from pathlib import Path
import sys
import numpy as np
import cv2
import onnxruntime as ort

# --- Style mapping ---
STYLE_MAP = {
    "AnimeGANv3_Hayao_STYLE_36.onnx": "ghibli",
    "AnimeGANv3_Shinkai_37.onnx": "dreamy",
    "AnimeGANv3_Hayao_36.onnx": "custom",
}


def list_images(p: Path):
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    if p.is_dir():
        for f in sorted(p.iterdir()):
            if f.suffix.lower() in exts:
                yield f
    elif p.is_file() and p.suffix.lower() in exts:
        yield p
    else:
        raise FileNotFoundError(f"No images found at {p}")


def resolve_providers(use_gpu: bool):
    if use_gpu and "CUDAExecutionProvider" in ort.get_available_providers():
        return ["CUDAExecutionProvider", "CPUExecutionProvider"]
    return ["CPUExecutionProvider"]


def load_session(model_path: Path, providers):
    so = ort.SessionOptions()
    so.intra_op_num_threads = 0
    so.inter_op_num_threads = 0
    return ort.InferenceSession(str(model_path), providers=providers, sess_options=so)


def parse_model_io(sess):
    inp = sess.get_inputs()[0]
    out = sess.get_outputs()[0]
    return inp.name, out.name, list(inp.shape), list(out.shape)


def is_nchw(shape):
    return len(shape) == 4 and shape[1] in (1, 3)


def is_nhwc(shape):
    return len(shape) == 4 and shape[-1] in (1, 3)


def target_hw_from_shape(shape, src_h, src_w, force_size=None):
    if force_size:
        return force_size
    if len(shape) == 4:
        if is_nchw(shape):
            _, _, H, W = shape
        elif is_nhwc(shape):
            _, H, W, _ = shape
        if isinstance(H, int) and isinstance(W, int) and H > 0 and W > 0:
            return (H, W)

    def round8(x):
        return int(np.ceil(x / 8) * 8)

    return (round8(src_h), round8(src_w))


def preprocess(img_bgr, target_hw, layout, norm):
    th, tw = target_hw
    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (tw, th), interpolation=cv2.INTER_AREA)
    img = img.astype(np.float32)
    if norm == "neg1_1":
        img = img / 127.5 - 1.0
    elif norm == "0_1":
        img = img / 255.0
    else:
        raise ValueError("norm must be 'neg1_1' or '0_1'")
    if layout == "NCHW":
        img = np.transpose(img, (2, 0, 1))
    return np.expand_dims(img, 0).copy()


def postprocess(out, layout, norm):
    if layout == "NCHW":
        out = np.transpose(out, (0, 2, 3, 1))
    out = out[0]
    if norm == "neg1_1":
        out = (out + 1.0) * 127.5
    elif norm == "0_1":
        out = out * 255.0
    out = np.clip(out, 0, 255).astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_RGB2BGR)


def main():
    ap = argparse.ArgumentParser(description="AnimeGANv3 ONNX — Local Inference")
    ap.add_argument(
        "--models", required=True, type=Path, help="Folder with .onnx models"
    )
    ap.add_argument(
        "--input", required=True, type=Path, help="Image or folder of images"
    )
    ap.add_argument("--output", required=True, type=Path, help="Output folder")
    ap.add_argument(
        "--gpu", action="store_true", help="Use CUDAExecutionProvider if available"
    )
    ap.add_argument("--norm", default="neg1_1", choices=["neg1_1", "0_1"])
    ap.add_argument("--size", nargs=2, type=int, metavar=("H", "W"))
    ap.add_argument(
        "--style", choices=["ghibli", "dreamy", "custom"], help="Run only this style"
    )
    args = ap.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    providers = resolve_providers(args.gpu)

    models = list(args.models.glob("*.onnx"))
    if not models:
        print(f"[WARN] No .onnx models found in {args.models}")
        sys.exit(1)

    images = list(list_images(args.input))
    if not images:
        print(f"[WARN] No images found in {args.input}")
        sys.exit(1)

    # --- Filter models by style ---
    selected_models = []
    for model_path in models:
        style_name = "custom"
        for key, val in STYLE_MAP.items():
            if key.lower() in model_path.name.lower():
                style_name = val
                break

        if args.style:
            if style_name == args.style:
                selected_models.append((model_path, style_name))
        else:
            selected_models.append((model_path, style_name))

    if not selected_models:
        print(f"[WARN] No models matched style={args.style}")
        sys.exit(1)

    for model_path, style_name in selected_models:
        print(f"[INFO] Loading model: {model_path} as style '{style_name}'")
        sess = load_session(model_path, providers)
        in_name, out_name, in_shape, out_shape = parse_model_io(sess)
        layout = "NCHW" if is_nchw(in_shape) else "NHWC"
        print(f"[INFO] Model input: {in_name}, shape={in_shape}, layout={layout}")

        for img_path in images:
            img_bgr = cv2.imread(str(img_path), cv2.IMREAD_COLOR)
            if img_bgr is None:
                print(f"[WARN] Could not read {img_path}, skipping")
                continue

            th, tw = target_hw_from_shape(
                in_shape,
                img_bgr.shape[0],
                img_bgr.shape[1],
                tuple(args.size) if args.size else None,
            )
            inp = preprocess(img_bgr, (th, tw), layout, args.norm)
            ort_out = sess.run([out_name], {in_name: inp})[0]
            out_bgr = postprocess(ort_out, layout, args.norm)

            # Save directly into args.output folder
            out_file = args.output / f"{img_path.stem}_{style_name}{img_path.suffix}"
            cv2.imwrite(str(out_file), out_bgr)
            print(f"[OK] Wrote: {out_file}")


if __name__ == "__main__":
    main()
