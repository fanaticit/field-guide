import sys
import argparse
from PIL import Image

def main():
    parser = argparse.ArgumentParser(description="Extract and resize a monster icon from an image.")
    parser.add_argument("--input", required=True, help="Path to input image")
    parser.add_argument("--output", required=True, help="Path to save the output icon")
    parser.add_argument("--crop", help="Crop coordinates: left,upper,right,lower (e.g., 10,10,100,100)")
    parser.add_argument("--resize", help="Resize dimensions: width,height (e.g., 256,256)", default="256,256")
    
    args = parser.parse_args()
    
    try:
        img = Image.open(args.input).convert("RGBA")
        
        if args.crop:
            coords = tuple(map(int, args.crop.split(',')))
            img = img.crop(coords)
            
        if args.resize:
            dims = tuple(map(int, args.resize.split(',')))
            img = img.resize(dims, Image.Resampling.LANCZOS)
            
        img.save(args.output, "PNG")
        print(f"Successfully extracted and saved icon to {args.output}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
