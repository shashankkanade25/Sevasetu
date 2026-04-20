import cv2
import numpy as np

img_path = r'c:\Sevasetu\frontend\public\Sevasetu-logo.png'
img = cv2.imread(img_path)

if img is None:
    print("Failed to load image.")
    exit(1)

# The image might have an alpha channel or solid white background.
# Convert to HSV.
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

def get_svg_paths(mask, simplify_factor=0.003):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    paths = []
    
    # Sort contours by area, descending. We only care about the large chunks.
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    for cnt in contours:
        if cv2.contourArea(cnt) < 50: # ignore very small noise
            continue
            
        epsilon = simplify_factor * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        
        # Build SVG path
        if len(approx) > 2:
            path_str = "M " + " ".join([f"{pt[0][0]},{pt[0][1]}" for pt in approx]) + " Z"
            paths.append(path_str)
            
    return paths

# 1. Red (Care arc) - Hue 0-10 or 170-180
lower_red1 = np.array([0, 100, 100])
upper_red1 = np.array([10, 255, 255])
mask_red1 = cv2.inRange(hsv, lower_red1, upper_red1)

lower_red2 = np.array([170, 100, 100])
upper_red2 = np.array([180, 255, 255])
mask_red2 = cv2.inRange(hsv, lower_red2, upper_red2)
mask_red = cv2.bitwise_or(mask_red1, mask_red2)

red_paths = get_svg_paths(mask_red, 0.005)

# 2. Gold/Yellow (Warmth arc) - Hue ~15-35
lower_gold = np.array([15, 100, 100])
upper_gold = np.array([35, 255, 255])
mask_gold = cv2.inRange(hsv, lower_gold, upper_gold)
gold_paths = get_svg_paths(mask_gold, 0.005)

# 3. Green (Ground + small figure) - Hue ~40-80
lower_green = np.array([40, 50, 50])
upper_green = np.array([85, 255, 255])
mask_green = cv2.inRange(hsv, lower_green, upper_green)
green_paths = get_svg_paths(mask_green, 0.002) # finer detail for figure

# 4. Blue (Helper figure) - Hue ~90-140
lower_blue = np.array([90, 50, 50])
upper_blue = np.array([140, 255, 255])
mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)
blue_paths = get_svg_paths(mask_blue, 0.002)

# 5. Black (Text "सेवासेतु") - Hue doesn't matter, Value < 80
lower_black = np.array([0, 0, 0])
upper_black = np.array([180, 255, 100])
mask_black = cv2.inRange(hsv, lower_black, upper_black)
black_paths = get_svg_paths(mask_black, 0.002)

print("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {} {}'>".format(img.shape[1], img.shape[0]))

print('  <!-- Red -->')
for p in red_paths: print(f'  <path d="{p}" fill="#D63031" />')

print('  <!-- Gold -->')
for p in gold_paths: print(f'  <path d="{p}" fill="#F5A623" />')

print('  <!-- Green -->')
for p in green_paths: print(f'  <path d="{p}" fill="#27AE60" />')

print('  <!-- Blue -->')
for p in blue_paths: print(f'  <path d="{p}" fill="#2E86DE" />')

print('  <!-- Text/Black -->')
for p in black_paths: print(f'  <path d="{p}" fill="#000000" />')

print("</svg>")
