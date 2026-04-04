import cv2
import time
import threading
import os
import numpy as np
from flask import Flask, Response, jsonify
from flask_cors import CORS
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# ============================================
# CONFIG
# ============================================
W, H = 3840, 2160
CONFIDENCE_THRESHOLD = 0.15
IOU_THRESHOLD = 0.45
SKIP_FRAMES = 3
IMG_SIZE = 1280
DATASET_FOLDER = "CapturedImage"

# Duplicate suppression / merging
DUPLICATE_IOU_THRESHOLD = 0.20

# False-positive filtering
MIN_BOX_AREA = 2000
MIN_ASPECT_RATIO = 0.25
MAX_ASPECT_RATIO = 3.50

# Optional ROI filtering
USE_ROI = False
ROI_X1, ROI_Y1, ROI_X2, ROI_Y2 = 800, 400, 3000, 1900

# Germination logic
GERMINATION_MIN_COUNT = 1
GERMINATION_CONFIRM_FRAMES = 5

# Count stabilization
COUNT_STABILITY_FRAMES = 3

if not os.path.exists(DATASET_FOLDER):
    os.makedirs(DATASET_FOLDER)

# ============================================
# GLOBAL VARS
# ============================================
camera_active = False
is_processing = False
view_mode = "normal"

output_frame = None
lock = threading.Lock()

germination_confirm_counter = 0
germination_saved_for_batch = {}
capture_counter = 0

stable_detected_count = 0
candidate_detected_count = 0
candidate_count_frames = 0

current_params = {
    "batch": "Batch A"
}

latest_stats = {
    "pechay_detected": 0,
    "seedTarget": 30,
    "confidenceScore": 0,
    "is_processing": False,
    "camera_active": False,
    "view_mode": "normal",
    "germination_confirm_counter": 0,
    "germination_saved": False,
    "batch": current_params["batch"]
}

# ============================================
# LOAD MODEL
# ============================================
print("Loading YOLO Model...")
try:
    model = YOLO("best.pt")
    print("Model Loaded!")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None


# ============================================
# HELPERS
# ============================================
def save_actual_germination_date(batch_id):
    global germination_saved_for_batch

    if batch_id not in germination_saved_for_batch:
        germination_saved_for_batch[batch_id] = False

    if germination_saved_for_batch[batch_id]:
        return

    germination_saved_for_batch[batch_id] = True
    print(f"Germination confirmed for {batch_id}")


def clamp_box(x1, y1, x2, y2, width, height):
    x1 = max(0, min(x1, width - 1))
    y1 = max(0, min(y1, height - 1))
    x2 = max(0, min(x2, width))
    y2 = max(0, min(y2, height))
    return x1, y1, x2, y2


def compute_iou(box_a, box_b):
    ax1, ay1, ax2, ay2 = box_a["x1"], box_a["y1"], box_a["x2"], box_a["y2"]
    bx1, by1, bx2, by2 = box_b["x1"], box_b["y1"], box_b["x2"], box_b["y2"]

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)

    union_area = area_a + area_b - inter_area
    if union_area <= 0:
        return 0.0

    return inter_area / union_area


def box_center(box):
    return (
        (box["x1"] + box["x2"]) / 2.0,
        (box["y1"] + box["y2"]) / 2.0
    )


def center_distance(box_a, box_b):
    ax, ay = box_center(box_a)
    bx, by = box_center(box_b)
    return ((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5


def is_box_inside(box_a, box_b, margin=20):
    return (
        box_a["x1"] >= box_b["x1"] - margin and
        box_a["y1"] >= box_b["y1"] - margin and
        box_a["x2"] <= box_b["x2"] + margin and
        box_a["y2"] <= box_b["y2"] + margin
    )


def adaptive_center_threshold(box_a, box_b, scale=0.4):
    wa = box_a["x2"] - box_a["x1"]
    ha = box_a["y2"] - box_a["y1"]
    wb = box_b["x2"] - box_b["x1"]
    hb = box_b["y2"] - box_b["y1"]

    size_ref = max(wa, ha, wb, hb)
    return max(80, size_ref * scale)


def merge_two_boxes(box_a, box_b):
    return {
        "x1": min(box_a["x1"], box_b["x1"]),
        "y1": min(box_a["y1"], box_b["y1"]),
        "x2": max(box_a["x2"], box_b["x2"]),
        "y2": max(box_a["y2"], box_b["y2"]),
        "conf": max(box_a["conf"], box_b["conf"])
    }


def deduplicate_boxes(boxes, iou_threshold=0.20):
    if not boxes:
        return []

    boxes = sorted(boxes, key=lambda b: b["conf"], reverse=True)
    kept = []

    for candidate in boxes:
        merged = False

        for i, kept_box in enumerate(kept):
            iou = compute_iou(candidate, kept_box)
            dist = center_distance(candidate, kept_box)
            dynamic_threshold = adaptive_center_threshold(candidate, kept_box, scale=0.4)

            if (
                iou >= iou_threshold or
                dist <= dynamic_threshold or
                is_box_inside(candidate, kept_box) or
                is_box_inside(kept_box, candidate)
            ):
                kept[i] = merge_two_boxes(candidate, kept_box)
                merged = True
                break

        if not merged:
            kept.append(candidate)

    return kept


def get_roi_frame(frame):
    if not USE_ROI:
        return frame, 0, 0

    roi = frame[ROI_Y1:ROI_Y2, ROI_X1:ROI_X2]
    return roi, ROI_X1, ROI_Y1


def filter_boxes(result_boxes, offset_x=0, offset_y=0):
    filtered = []

    for box in result_boxes:
        conf = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        x1 += offset_x
        x2 += offset_x
        y1 += offset_y
        y2 += offset_y

        x1, y1, x2, y2 = clamp_box(x1, y1, x2, y2, W, H)

        w = x2 - x1
        h = y2 - y1
        area = w * h

        if w <= 0 or h <= 0:
            continue

        aspect_ratio = w / h

        if conf < CONFIDENCE_THRESHOLD:
            continue
        if area < MIN_BOX_AREA:
            continue
        if aspect_ratio < MIN_ASPECT_RATIO or aspect_ratio > MAX_ASPECT_RATIO:
            continue

        filtered.append({
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
            "conf": conf
        })

    return filtered


def run_detection(frame):
    infer_frame, offset_x, offset_y = get_roi_frame(frame)

    results = model.predict(
        infer_frame,
        conf=CONFIDENCE_THRESHOLD,
        iou=IOU_THRESHOLD,
        imgsz=IMG_SIZE,
        verbose=False
    )

    raw_boxes = filter_boxes(results[0].boxes, offset_x, offset_y)
    boxes = deduplicate_boxes(raw_boxes, iou_threshold=DUPLICATE_IOU_THRESHOLD)

    if boxes:
        avg_conf = round((sum(b["conf"] for b in boxes) / len(boxes)) * 100, 1)
    else:
        avg_conf = 0.0

    return boxes, avg_conf


def draw_boxes(frame, boxes):
    annotated_frame = frame.copy()
    masked_frame = np.zeros_like(frame)

    for b in boxes:
        x1, y1, x2, y2 = b["x1"], b["y1"], b["x2"], b["y2"]
        conf = b["conf"]

        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            annotated_frame,
            f"Pechay {conf:.2f}",
            (x1, max(20, y1 - 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2
        )

        try:
            masked_frame[y1:y2, x1:x2] = frame[y1:y2, x1:x2]
            cv2.rectangle(masked_frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
        except Exception:
            pass

    if USE_ROI:
        cv2.rectangle(annotated_frame, (ROI_X1, ROI_Y1), (ROI_X2, ROI_Y2), (255, 0, 0), 2)
        cv2.rectangle(masked_frame, (ROI_X1, ROI_Y1), (ROI_X2, ROI_Y2), (255, 0, 0), 2)

    return annotated_frame, masked_frame


def reset_count_state():
    global germination_confirm_counter
    global stable_detected_count
    global candidate_detected_count
    global candidate_count_frames

    germination_confirm_counter = 0
    stable_detected_count = 0
    candidate_detected_count = 0
    candidate_count_frames = 0


# ============================================
# CAMERA THREAD
# ============================================
def process_camera():
    global output_frame
    global latest_stats
    global camera_active
    global view_mode
    global is_processing
    global germination_confirm_counter
    global stable_detected_count
    global candidate_detected_count
    global candidate_count_frames

    cap = None
    frame_count = 0
    last_annotated_frame = None
    last_masked_frame = None

    while True:
        try:
            if not camera_active:
                if cap is not None:
                    cap.release()
                    cap = None
                    print("Camera released / sleep mode.")

                frame_count = 0
                last_annotated_frame = None
                last_masked_frame = None
                reset_count_state()

                with lock:
                    output_frame = np.zeros((H, W, 3), dtype=np.uint8)
                    latest_stats["camera_active"] = False
                    latest_stats["is_processing"] = False
                    latest_stats["view_mode"] = view_mode
                    latest_stats["pechay_detected"] = 0
                    latest_stats["confidenceScore"] = 0
                    latest_stats["germination_confirm_counter"] = 0
                    latest_stats["germination_saved"] = germination_saved_for_batch.get(
                        current_params["batch"], False
                    )

                time.sleep(0.2)
                continue

            if cap is None:
                print("Starting Camera...")
                cap = cv2.VideoCapture(0)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, W)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, H)
                time.sleep(0.5)

                if not cap.isOpened():
                    print("Failed to open camera! Retrying...")
                    cap = None
                    time.sleep(1)
                    continue

            success, frame = cap.read()
            if not success:
                print("Failed to read frame. Skipping...")
                time.sleep(0.01)
                continue

            frame = cv2.flip(frame, -1)
            final_frame = frame.copy()
            batch_id = current_params.get("batch", "Batch A")

            if is_processing and model is not None:
                frame_count += 1

                if frame_count % SKIP_FRAMES == 0 or last_annotated_frame is None:
                    filtered_boxes, current_conf = run_detection(frame)
                    raw_count = len(filtered_boxes)

                    # ============================================
                    # COUNT STABILIZATION
                    # ============================================
                    if raw_count == stable_detected_count:
                        candidate_detected_count = raw_count
                        candidate_count_frames = 0
                    else:
                        if raw_count == candidate_detected_count:
                            candidate_count_frames += 1
                        else:
                            candidate_detected_count = raw_count
                            candidate_count_frames = 1

                        if candidate_count_frames >= COUNT_STABILITY_FRAMES:
                            stable_detected_count = candidate_detected_count
                            candidate_count_frames = 0

                    count = stable_detected_count

                    with lock:
                        if count >= GERMINATION_MIN_COUNT:
                            germination_confirm_counter += 1
                        else:
                            germination_confirm_counter = 0

                        latest_stats["pechay_detected"] = count
                        latest_stats["confidenceScore"] = current_conf
                        latest_stats["germination_confirm_counter"] = germination_confirm_counter

                    if germination_confirm_counter >= GERMINATION_CONFIRM_FRAMES:
                        save_actual_germination_date(batch_id)

                    annotated_frame, masked_frame = draw_boxes(frame, filtered_boxes)
                    last_annotated_frame = annotated_frame
                    last_masked_frame = masked_frame
                else:
                    if last_annotated_frame is not None and last_masked_frame is not None:
                        annotated_frame = last_annotated_frame
                        masked_frame = last_masked_frame
                    else:
                        annotated_frame = frame.copy()
                        masked_frame = np.zeros_like(frame)

                final_frame = masked_frame if view_mode == "masked" else annotated_frame

            else:
                frame_count = 0
                reset_count_state()

                with lock:
                    latest_stats["pechay_detected"] = 0
                    latest_stats["confidenceScore"] = 0
                    latest_stats["germination_confirm_counter"] = 0

                final_frame = frame

            with lock:
                latest_stats["is_processing"] = is_processing
                latest_stats["camera_active"] = camera_active
                latest_stats["view_mode"] = view_mode
                latest_stats["batch"] = current_params["batch"]
                latest_stats["germination_saved"] = germination_saved_for_batch.get(
                    batch_id, False
                )
                output_frame = final_frame.copy()

            time.sleep(0.005)

        except Exception as e:
            print(f"Camera thread error: {e}")
            time.sleep(0.2)


# Start camera thread
t = threading.Thread(target=process_camera, daemon=True)
t.start()


# ============================================
# ROUTES
# ============================================
@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            if not camera_active and output_frame is None:
                time.sleep(0.5)
                continue

            with lock:
                if output_frame is None:
                    time.sleep(0.05)
                    continue

                flag, encodedImage = cv2.imencode(
                    ".jpg",
                    output_frame,
                    [int(cv2.IMWRITE_JPEG_QUALITY), 70]
                )

            if not flag:
                continue

            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' +
                encodedImage.tobytes() +
                b'\r\n'
            )
            time.sleep(0.03)

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/status')
def get_status():
    with lock:
        return jsonify(dict(latest_stats))


@app.route('/toggle_inference', methods=['POST'])
def toggle_inference():
    global is_processing

    is_processing = not is_processing

    if not is_processing:
        reset_count_state()
        with lock:
            latest_stats["germination_confirm_counter"] = 0
            latest_stats["pechay_detected"] = 0
            latest_stats["confidenceScore"] = 0

    print(f"Inference Toggled: {is_processing}")
    return jsonify({"status": is_processing})


@app.route('/toggle_camera', methods=['POST'])
def toggle_camera():
    global camera_active, is_processing

    camera_active = not camera_active

    if not camera_active:
        is_processing = False
        reset_count_state()
        with lock:
            latest_stats["germination_confirm_counter"] = 0
            latest_stats["pechay_detected"] = 0
            latest_stats["confidenceScore"] = 0

    print(f"Camera Toggled: {camera_active}")
    return jsonify({"status": camera_active})


@app.route('/toggle_view', methods=['POST'])
def toggle_view():
    global view_mode
    view_mode = "masked" if view_mode == "normal" else "normal"
    print(f"View Mode Toggled: {view_mode}")
    return jsonify({"status": "success", "mode": view_mode})


@app.route('/capture_image', methods=['POST'])
def capture_image():
    global output_frame, capture_counter

    if output_frame is None:
        return jsonify({"status": "error", "message": "No frame"}), 400

    capture_counter += 1
    filename = f"{DATASET_FOLDER}/img_{capture_counter}.jpg"

    while os.path.exists(filename):
        capture_counter += 1
        filename = f"{DATASET_FOLDER}/img_{capture_counter}.jpg"

    with lock:
        cv2.imwrite(filename, output_frame)

    return jsonify({"status": "success", "file": filename})


@app.route('/set_batch/<batch_name>', methods=['POST'])
def set_batch(batch_name):
    global germination_confirm_counter
    global stable_detected_count
    global candidate_detected_count
    global candidate_count_frames

    with lock:
        current_params["batch"] = batch_name
        germination_confirm_counter = 0
        stable_detected_count = 0
        candidate_detected_count = 0
        candidate_count_frames = 0
        latest_stats["germination_confirm_counter"] = 0
        latest_stats["batch"] = batch_name
        latest_stats["pechay_detected"] = 0
        latest_stats["confidenceScore"] = 0

    if batch_name not in germination_saved_for_batch:
        germination_saved_for_batch[batch_name] = False

    return jsonify({
        "status": "success",
        "batch": batch_name,
        "germination_saved": germination_saved_for_batch[batch_name]
    })


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)