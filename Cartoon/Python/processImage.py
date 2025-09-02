import cv2
import sys
import numpy as np

def pencil_sketch(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    inv = 255 - gray
    blur = cv2.GaussianBlur(inv, (21, 21), 0)
    sketch = cv2.divide(gray, 255 - blur, scale=256)
    return sketch

def sketch(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.medianBlur(gray, 7)
    edges = cv2.Laplacian(blur, cv2.CV_8U, ksize=5)
    _, sketch_img = cv2.threshold(edges, 70, 255, cv2.THRESH_BINARY_INV)
    return sketch_img

def grayscale(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

def cartoonize(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.medianBlur(gray, 3)  # lighter blur
    edges = cv2.adaptiveThreshold(
        blur, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY, 9, 9
    )
    color = cv2.bilateralFilter(img, d=5, sigmaColor=100, sigmaSpace=100)
    cartoon = cv2.bitwise_and(color, color, mask=edges)
    return cartoon


def ghibli_style(img):
    painting = cv2.edgePreservingFilter(img, flags=1, sigma_s=80, sigma_r=0.4)
    painting = cv2.bilateralFilter(painting, d=5, sigmaColor=75, sigmaSpace=75)

    hsv = cv2.cvtColor(painting, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    s = cv2.add(s, 20)
    v = cv2.add(v, 10)
    hsv = cv2.merge([h, s, v])
    painting = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY, 9, 9
    )
    edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

    ghibli = cv2.bitwise_and(painting, edges)
    return ghibli


def process_image(input_path, style, output_path):
    img = cv2.imread(input_path)
    if img is None:
        raise Exception("Image not found!")

    style = style.lower()
    if style == "pencil":
        result = pencil_sketch(img)
    elif style == "sketch":
        result = sketch(img)
    elif style == "cartoon":
        result = cartoonize(img)
    elif style == "grayscale":
        result = grayscale(img)
    elif style == "ghibli":
        result = ghibli_style(img)
    else:
        raise Exception("Invalid style option! Choose 'pencil', 'sketch', 'cartoon', 'gray', or 'ghibli'.")

    # Ensure consistent 3-channel output
    # if len(result.shape) == 2:
    #     result = cv2.cvtColor(result, cv2.COLOR_GRAY2BGR)

    cv2.imwrite(output_path, result)
    return output_path

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python process_image.py <input_path> <style> <output_path>")

        sys.exit(1)

    input_path = sys.argv[1]
    style = sys.argv[2]
    output_path = sys.argv[3]

    try:
        result_path = process_image(input_path, style, output_path)
        print("Image saved at:", result_path)
    except Exception as e:
        print("Error:", str(e))
        sys.exit(1)
