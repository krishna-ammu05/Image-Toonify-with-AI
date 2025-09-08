# Python/processAI.py
import subprocess
import os
from pathlib import Path


def run_model(image_path, output_base, model_type, style=None):
    """
    Run the AI model on the given image.
    - image_path: path to input image
    - output_base: base output folder (processed/)
    - model_type: 'anime' or 'cartoon-gan'
    - style: optional, specific anime style
    """
    image_path_abs = os.path.abspath(image_path)
    output_base_abs = os.path.abspath(output_base)
    os.makedirs(output_base_abs, exist_ok=True)

    if not os.path.exists(image_path_abs):
        raise FileNotFoundError(f"Input image not found: {image_path_abs}")

    # Output filename exactly matches uploaded filename
    output_file = os.path.join(output_base_abs, Path(image_path_abs).name)

    if model_type.lower() == "cartoon-gan":
        cwd = os.path.abspath(os.path.join("ai_models", "cartoon-gan"))
        transform_script = os.path.join(cwd, "transform.py")

        # Cartoon-GAN transform.py only accepts --input
        cmd = f'python "{transform_script}" --input "{image_path_abs}"'
        print(f"[Cartoon-GAN] Running command: {cmd}")
        subprocess.run(cmd, shell=True, check=True)

        # Move default output to target filename
        default_output_dir = Path.cwd() / "public" / "processed" / "cartoon"
        default_file = default_output_dir / Path(image_path_abs).name.replace(" ", "_")
        if default_file.exists():
            os.replace(default_file, output_file)
        else:
            print(f"[WARN] Expected CartoonGAN output not found: {default_file}")

        return output_file

    elif model_type.lower() == "anime":
        cwd = os.path.abspath(os.path.join("ai_models", "anime"))
        infer_script = os.path.join(cwd, "infer.py")

        # AnimeGAN: output folder is the base processed folder
        cmd = (
            f'python "{infer_script}" --models "{cwd}" '
            f'--input "{image_path_abs}" --output "{output_base_abs}"'
        )
        if style:
            cmd += f" --style {style}"
        print(f"[AnimeGAN] Running command: {cmd}")
        subprocess.run(cmd, shell=True, check=True)

        # After processing, move the generated file to match exact uploaded filename
        # Assume infer.py saves as <filename>_<style>.png
        if style:
            generated_file = (
                Path(output_base_abs)
                / f"{Path(image_path_abs).stem}_{style}{Path(image_path_abs).suffix}"
            )
            if generated_file.exists():
                os.replace(generated_file, output_file)

        return output_file

    else:
        raise ValueError(f"Invalid model_type: {model_type}")


# Allow command-line usage
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 4:
        print(
            "Usage: python processAI.py <image_path> <output_path> <model_type> [style]"
        )
        sys.exit(1)

    img_path = sys.argv[1]
    out_path = sys.argv[2]
    model_type = sys.argv[3].lower()
    style = sys.argv[4].lower() if len(sys.argv) > 4 else None

    output_file = run_model(img_path, out_path, model_type, style)
    print(f"[OK] Processing completed successfully! Output saved at {output_file}")
