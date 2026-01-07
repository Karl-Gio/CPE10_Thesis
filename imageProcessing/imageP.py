import cv2
import numpy as np
import time
import os

# --- CONFIGURATION ---
SAVE_FOLDER = "../pechay_images_datasets"
if not os.path.exists(SAVE_FOLDER):
    os.makedirs(SAVE_FOLDER)

# --- WINDOW CONFIGURATION ---
WINDOW_NAME = "Pechay Germination Monitoring"
DISPLAY_WIDTH = 960
DISPLAY_HEIGHT = 540

# --- CAMERA SETUP ---
cap = cv2.VideoCapture(0, cv2.CAP_V4L2)

# Set Resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280) 
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
cap.set(cv2.CAP_PROP_FPS, 30)
cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
cap.set(cv2.CAP_PROP_AUTOFOCUS, 1) 

# --- SAFETY CHECK ---
if not cap.isOpened():
    print("❌ ERROR: Camera not found.")
    exit()

cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
cv2.resizeWindow(WINDOW_NAME, DISPLAY_WIDTH, DISPLAY_HEIGHT)

# --- TUNING: GREEN COLOR (HSV) ---
LOWER_GREEN = np.array([35, 40, 40])   # Adjusted slightly to catch lighter green (radicle)
UPPER_GREEN = np.array([85, 255, 255])

# --- TUNING: AREA SIZE THRESHOLDS ---
MIN_AREA_NOISE = 300      # Mas maliit para ma-detect ang Radicle
AREA_COTYLEDONS = 1500    # Size threshold para maging Cotyledon
AREA_TRUE_LEAVES = 8000   # Size threshold para maging True Leaves

# --- TUNING: LEAF SHAPE ---
DEFECT_DEPTH_SCALE = 10.0 

# --- IMPROVED DRAW LABEL FUNCTION (BOLD TEXT) ---
def draw_label(img, text, x, y, color):
    # UPDATED: Font settings for BOLD text
    font_face = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.8  # Mas malaking font size
    thickness = 2     # Mas makapal (BOLD)
    
    (text_width, text_height), _ = cv2.getTextSize(text, font_face, font_scale, thickness)
    
    # Background Box (Para mabasa pa rin kahit walang dashboard bg)
    box_coords = ((x, y - text_height - 8), (x + text_width + 8, y + 6))
    cv2.rectangle(img, box_coords[0], box_coords[1], color, cv2.FILLED)
    
    # Text (White)
    cv2.putText(img, text, (x + 4, y - 4), font_face, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

print("------------------------------------------------")
print("✅ PECHAY MONITOR READY - NEW STAGES")
print("   1. Radicle (Smallest)")
print("   2. Cotyledons (Round Leaves)")
print("   3. True Leaves (Germinated)")
print("------------------------------------------------")

while True:
    ret, frame = cap.read()
    if not ret: continue

    display = frame.copy()

    # 1. Image Processing
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, LOWER_GREEN, UPPER_GREEN)
    
    kernel = np.ones((5,5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Reset Counters
    count_radicle = 0
    count_cotyledons = 0
    count_true_leaves = 0
    total_plants = 0

    for cnt in contours:
        area = cv2.contourArea(cnt)

        # Filter Noise
        if area < MIN_AREA_NOISE: continue

        # Filter Check (Solidity/Aspect Ratio)
        x, y, w, h = cv2.boundingRect(cnt)
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        if hull_area == 0: continue
        solidity = float(area) / hull_area
        aspect_ratio = float(w) / h

        if solidity < 0.5: continue 
        if aspect_ratio > 4.0 or aspect_ratio < 0.2: continue 

        # --- SHAPE LOGIC FOR TRUE LEAVES ---
        has_true_leaves_shape = False
        hull_indices = cv2.convexHull(cnt, returnPoints=False)
        if len(hull_indices) > 3 and len(cnt) > 3:
            try:
                defects = cv2.convexityDefects(cnt, hull_indices)
                if defects is not None:
                    deep_defects = 0
                    for i in range(defects.shape[0]):
                        s, e, f, d = defects[i, 0]
                        depth = d / 256.0
                        if depth > (h / DEFECT_DEPTH_SCALE):
                            deep_defects += 1
                    
                    # Kapag may malalalim na hati, True Leaves na yan
                    if deep_defects >= 1:
                        has_true_leaves_shape = True
            except:
                pass

        # --- CLASSIFICATION LOGIC ---
        # Priority 1: True Leaves (Germinated) - Malaki na OR may complex shape
        if area > AREA_TRUE_LEAVES or (area > AREA_COTYLEDONS and has_true_leaves_shape):
            label = "True Leaves (Germinated)"
            color = (0, 255, 0) # Green
            count_true_leaves += 1

        # Priority 2: Cotyledons - Medium size, bilugan (walang defects)
        elif area > AREA_COTYLEDONS:
            label = "Cotyledons"
            color = (0, 165, 255) # Orange
            count_cotyledons += 1

        # Priority 3: Radicle - Pinakamaliit
        else:
            label = "Radicle"
            color = (128, 128, 128) # Gray (Para mukhang ugat/simula)
            count_radicle += 1

        # Draw Box & Label
        cv2.rectangle(display, (x, y), (x + w, y + h), color, 2)
        draw_label(display, label, x, y - 10, color)
        total_plants += 1

    # --- DASHBOARD (NO BACKGROUND) ---
    
    
    # Total Plants (Black Box for High Contrast)
    draw_label(display, f"TOTAL: {total_plants}", 10, 40, (0, 0, 0))
    
    # Specific Counts
    draw_label(display, f"Radicle:    {count_radicle}", 10, 80, (128, 128, 128))
    draw_label(display, f"Cotyledons: {count_cotyledons}", 10, 120, (0, 165, 255))
    draw_label(display, f"True Leaves: {count_true_leaves}", 10, 160, (0, 255, 0))

    cv2.imshow(WINDOW_NAME, display)

    key = cv2.waitKey(1)
    if key == ord('q'): break
    elif key == ord('s'):
        ts = time.strftime("%Y-%m-%d_%H-%M-%S")
        cv2.imwrite(f"{SAVE_FOLDER}/pechay_{ts}.jpg", display)
        print("📸 Captured!")

cap.release()
cv2.destroyAllWindows()
