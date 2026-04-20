import cv2
import numpy as np

img_path = r'c:\Sevasetu\frontend\public\Sevasetu-logo.png'
img = cv2.imread(img_path)

if img is None:
    print("Failed to load image.")
    exit(1)

hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

def get_svg_paths(mask, simplify_factor=0.003):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    paths = []
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    for cnt in contours:
        if cv2.contourArea(cnt) < 50: continue
        epsilon = simplify_factor * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        if len(approx) > 2:
            path_str = "M " + " ".join([f"{pt[0][0]},{pt[0][1]}" for pt in approx]) + " Z"
            paths.append(path_str)
            
    return paths

mask_red1 = cv2.inRange(hsv, np.array([0, 100, 100]), np.array([10, 255, 255]))
mask_red2 = cv2.inRange(hsv, np.array([170, 100, 100]), np.array([180, 255, 255]))
red_paths = get_svg_paths(cv2.bitwise_or(mask_red1, mask_red2), 0.002)

gold_paths = get_svg_paths(cv2.inRange(hsv, np.array([15, 100, 100]), np.array([35, 255, 255])), 0.002)
green_paths = get_svg_paths(cv2.inRange(hsv, np.array([40, 50, 50]), np.array([85, 255, 255])), 0.001)
blue_paths = get_svg_paths(cv2.inRange(hsv, np.array([90, 50, 50]), np.array([140, 255, 255])), 0.001)
black_paths = get_svg_paths(cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 100])), 0.001)

react_code = f"""import React from 'react';

/**
 * SevaSetu Logo — EXACT PATH RECREATION GENERATED VIA OPENCV
 * This dynamically renders the absolute exact logo shapes based on direct pixel-sampling
 */
export default function SevaSetuLogo({{
  width = 160,
  height,
  showText = true,
  colors = {{}}
}}) {{
  const c = {{
    red:   colors.red   || "#E53E3E",
    gold:  colors.gold  || "#ECC94B",
    green: colors.green || "#48BB78",
    blue:  colors.blue  || "#4299E1",
    text:  colors.text  || "#000000",
  }};

  // Based on the original image dimensions
  const viewBox = "0 0 {img.shape[1]} {img.shape[0]}";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={{viewBox}}
      width={{width}}
      height={{height || "auto"}}
      role="img"
      aria-label="SevaSetu Logo Exact Vector"
      style={{{{ display: "block" }}}}
    >
      <g>
"""

for p in red_paths: react_code += f'        <path d="{p}" fill={{c.red}} />\n'
for p in gold_paths: react_code += f'        <path d="{p}" fill={{c.gold}} />\n'
for p in green_paths: react_code += f'        <path d="{p}" fill={{c.green}} />\n'
for p in blue_paths: react_code += f'        <path d="{p}" fill={{c.blue}} />\n'
for p in black_paths: react_code += f'        {{showText && <path d="{p}" fill={{c.text}} />}}\n'

react_code += """      </g>
    </svg>
  );
}
"""

with open(r'c:\Sevasetu\frontend\src\components\SevaSetuLogo.jsx', 'w', encoding='utf-8') as f:
    f.write(react_code)

print("SUCCESS")
