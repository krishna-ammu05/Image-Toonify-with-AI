import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import sigmoid
from pathlib import Path
from PIL import Image
from torchvision import transforms
import argparse


# -----------------------------
# CartoonGAN Generator Network
# -----------------------------
class ResidualBlock(nn.Module):
    def __init__(self):
        super(ResidualBlock, self).__init__()
        self.conv_1 = nn.Conv2d(256, 256, 3, 1, 1)
        self.conv_2 = nn.Conv2d(256, 256, 3, 1, 1)
        self.norm_1 = nn.BatchNorm2d(256)
        self.norm_2 = nn.BatchNorm2d(256)

    def forward(self, x):
        output = self.norm_2(self.conv_2(F.relu(self.norm_1(self.conv_1(x)))))
        return output + x


class Generator(nn.Module):
    def __init__(self):
        super(Generator, self).__init__()
        self.conv_1 = nn.Conv2d(3, 64, 7, 1, 3)
        self.norm_1 = nn.BatchNorm2d(64)

        self.conv_2 = nn.Conv2d(64, 128, 3, 2, 1)
        self.conv_3 = nn.Conv2d(128, 128, 3, 1, 1)
        self.norm_2 = nn.BatchNorm2d(128)

        self.conv_4 = nn.Conv2d(128, 256, 3, 2, 1)
        self.conv_5 = nn.Conv2d(256, 256, 3, 1, 1)
        self.norm_3 = nn.BatchNorm2d(256)

        self.res = nn.Sequential(*[ResidualBlock() for _ in range(8)])

        self.conv_6 = nn.ConvTranspose2d(256, 128, 3, 2, 1, output_padding=1)
        self.conv_7 = nn.ConvTranspose2d(128, 128, 3, 1, 1)
        self.norm_4 = nn.BatchNorm2d(128)

        self.conv_8 = nn.ConvTranspose2d(128, 64, 3, 2, 1, output_padding=1)
        self.conv_9 = nn.ConvTranspose2d(64, 64, 3, 1, 1)
        self.norm_5 = nn.BatchNorm2d(64)

        self.conv_10 = nn.Conv2d(64, 3, 7, 1, 3)

    def forward(self, x):
        x = F.relu(self.norm_1(self.conv_1(x)))
        x = F.relu(self.norm_2(self.conv_3(self.conv_2(x))))
        x = F.relu(self.norm_3(self.conv_5(self.conv_4(x))))
        x = self.res(x)
        x = F.relu(self.norm_4(self.conv_7(self.conv_6(x))))
        x = F.relu(self.norm_5(self.conv_9(self.conv_8(x))))
        x = self.conv_10(x)
        return sigmoid(x)


# -----------------------------
# Main Script
# -----------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CartoonGAN Inference")
    parser.add_argument("--input", required=True, help="Path to input image")
    parser.add_argument(
        "--output_dir",
        required=False,
        default=None,
        help="Optional output folder. Defaults to public/processed/",
    )
    args = parser.parse_args()

    # Check input image
    img_path = Path(args.input)
    if not img_path.is_file():
        print(f"[ERROR] Input file not found: {img_path}")
        exit(1)

    # Determine output folder
    if args.output_dir:
        out_dir = Path(args.output_dir)
    else:
        out_dir = Path.cwd() / "public" / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load pre-trained model weights
    model_path = Path(__file__).resolve().parent / "generator_latest.pth"
    if not model_path.is_file():
        print(f"[ERROR] Missing pre-trained weights: {model_path}")
        exit(1)

    checkpoint = torch.load(model_path, map_location="cpu")
    G = Generator().to("cpu")
    G.load_state_dict(checkpoint["g_state_dict"])
    G.eval()

    transformer = transforms.Compose([transforms.ToTensor()])

    # Load and process image
    with Image.open(img_path) as img:
        inp = transformer(img)[None]
        result = G(inp)
        result_img = transforms.ToPILImage()(result[0].detach()).convert("RGB")

    # Output filename exactly same as uploaded file
    output_file = out_dir / img_path.name

    # Save result
    result_img.save(output_file)
    print(f"[OK] CartoonGAN result saved at {output_file}")
