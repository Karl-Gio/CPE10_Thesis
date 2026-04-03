import time
import cv2
import numpy as np

from config import (
    W,
    H,
    CONFIDENCE_THRESHOLD,
    SKIP_FRAMES,
    INFERENCE_INTERVAL,
    INFERENCE_DURATION,
    GERMINATION_MIN_COUNT,
    GERMINATION_CONFIRM_FRAMES,
    START_DATE,
)


class CameraService:
    def __init__(self, system_service):
        self.system_service = system_service

    def process_camera_loop(self):
        cap = None
        frame_count = 0
        last_annotated_frame = None
        last_masked_frame = None

        while True:
            try:
                if not self.system_service.camera_active:
                    if cap is not None:
                        cap.release()
                        cap = None
                        print("📷 Camera released.")

                    self.system_service.is_processing = False
                    self.system_service.inference_start_time = None
                    frame_count = 0
                    last_annotated_frame = None
                    last_masked_frame = None

                    with self.system_service.lock:
                        self.system_service.output_frame = np.zeros((H, W, 3), dtype=np.uint8)
                        self.system_service.latest_stats["camera_active"] = False
                        self.system_service.latest_stats["is_processing"] = False
                        self.system_service.latest_stats["view_mode"] = self.system_service.view_mode
                        self.system_service.latest_stats["pechay_detected"] = 0
                        self.system_service.latest_stats["confidenceScore"] = 0
                        self.system_service.latest_stats["mode"] = "CAMERA_OFF"
                        self.system_service.latest_stats["next_inference_in_sec"] = INFERENCE_INTERVAL
                        self.system_service.latest_stats["remaining_inference_sec"] = 0
                        self.system_service.latest_stats["manual_override"] = self.system_service.manual_override
                        self.system_service.latest_stats["germination_confirm_counter"] = self.system_service.germination_confirm_counter
                        self.system_service.latest_stats["germination_saved"] = self.system_service.germination_saved_for_batch.get(
                            self.system_service.current_params.get("batch", "Batch A"), False
                        )
                        self.system_service.latest_stats["batch"] = self.system_service.current_params.get("batch", "Batch A")
                        self.system_service.latest_stats["model_loaded"] = self.system_service.model is not None

                    time.sleep(0.2)
                    continue

                if cap is None:
                    print("🚀 Opening camera...")
                    cap = cv2.VideoCapture(0)
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, W)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, H)
                    time.sleep(0.5)

                    if not cap.isOpened():
                        print("⚠️ Camera not opened. Retrying...")
                        cap = None
                        time.sleep(1)
                        continue

                success, frame = cap.read()
                if not success:
                    time.sleep(0.01)
                    continue

                frame = cv2.flip(frame, 1)
                final_frame = frame.copy()
                current_time = time.time()

                if not self.system_service.manual_override:
                    if (not self.system_service.is_processing) and (
                        (current_time - self.system_service.last_inference_end) >= INFERENCE_INTERVAL
                    ):
                        print("🟢 Starting scheduled inference for 5 minutes...")
                        self.system_service.is_processing = True
                        self.system_service.inference_start_time = current_time
                        frame_count = 0
                        last_annotated_frame = None
                        last_masked_frame = None
                        self.system_service.max_detected = 0
                        self.system_service.germination_confirm_counter = 0

                    if self.system_service.is_processing and self.system_service.inference_start_time is not None:
                        if (current_time - self.system_service.inference_start_time) >= INFERENCE_DURATION:
                            print("🔴 Stopping scheduled inference.")
                            print("💾 Saving data after inference cycle...")
                            self.system_service.save_to_laravel()

                            self.system_service.max_detected = 0
                            self.system_service.is_processing = False
                            self.system_service.inference_start_time = None
                            self.system_service.last_inference_end = current_time
                            frame_count = 0
                            last_annotated_frame = None
                            last_masked_frame = None
                            self.system_service.germination_confirm_counter = 0

                if self.system_service.is_processing and self.system_service.model is not None:
                    frame_count += 1

                    if frame_count % SKIP_FRAMES == 0 or last_annotated_frame is None:
                        results = self.system_service.model.predict(
                            frame,
                            conf=CONFIDENCE_THRESHOLD,
                            verbose=False,
                            imgsz=256
                        )

                        valid_boxes = [
                            box for box in results[0].boxes
                            if box.conf.item() >= CONFIDENCE_THRESHOLD
                        ]
                        count = len(valid_boxes)

                        self.system_service.max_detected = max(self.system_service.max_detected, count)
                        batch_id = self.system_service.current_params.get("batch", "Batch A")

                        if count >= GERMINATION_MIN_COUNT:
                            with self.system_service.lock:
                                self.system_service.germination_confirm_counter += 1
                        else:
                            with self.system_service.lock:
                                self.system_service.germination_confirm_counter = 0

                        if self.system_service.germination_confirm_counter >= GERMINATION_CONFIRM_FRAMES:
                            self.system_service.save_actual_germination_date(batch_id)

                        current_conf = (
                            round(
                                (sum(box.conf.item() for box in valid_boxes) / count) * 100,
                                1
                            ) if count > 0 else 0
                        )

                        annotated_frame = frame.copy()
                        masked_frame = np.zeros_like(frame)

                        for box in valid_boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            x1, y1 = max(0, x1), max(0, y1)
                            x2, y2 = min(W, x2), min(H, y2)

                            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                            try:
                                masked_frame[y1:y2, x1:x2] = frame[y1:y2, x1:x2]
                            except Exception:
                                pass

                        last_annotated_frame = annotated_frame
                        last_masked_frame = masked_frame

                        with self.system_service.lock:
                            self.system_service.latest_stats["pechay_detected"] = count
                            self.system_service.latest_stats["confidenceScore"] = current_conf
                            self.system_service.latest_stats["germination_confirm_counter"] = self.system_service.germination_confirm_counter
                            self.system_service.latest_stats["germination_saved"] = self.system_service.germination_saved_for_batch.get(
                                batch_id, False
                            )

                    else:
                        annotated_frame = last_annotated_frame if last_annotated_frame is not None else frame
                        masked_frame = last_masked_frame if last_masked_frame is not None else np.zeros_like(frame)

                    final_frame = masked_frame if self.system_service.view_mode == "masked" else annotated_frame

                else:
                    frame_count = 0
                    final_frame = frame
                    with self.system_service.lock:
                        self.system_service.germination_confirm_counter = 0
                        self.system_service.latest_stats["pechay_detected"] = 0
                        self.system_service.latest_stats["confidenceScore"] = 0
                        self.system_service.latest_stats["germination_confirm_counter"] = 0

                with self.system_service.lock:
                    self.system_service.latest_stats["is_processing"] = self.system_service.is_processing
                    self.system_service.latest_stats["camera_active"] = self.system_service.camera_active
                    self.system_service.latest_stats["view_mode"] = self.system_service.view_mode
                    self.system_service.latest_stats["manual_override"] = self.system_service.manual_override
                    self.system_service.latest_stats["batch"] = self.system_service.current_params.get("batch", "Batch A")
                    self.system_service.latest_stats["model_loaded"] = self.system_service.model is not None

                    if not self.system_service.camera_active:
                        self.system_service.latest_stats["mode"] = "CAMERA_OFF"
                        self.system_service.latest_stats["next_inference_in_sec"] = INFERENCE_INTERVAL
                        self.system_service.latest_stats["remaining_inference_sec"] = 0
                    elif self.system_service.manual_override:
                        self.system_service.latest_stats["mode"] = "MANUAL"
                        self.system_service.latest_stats["next_inference_in_sec"] = 0
                        self.system_service.latest_stats["remaining_inference_sec"] = 0
                    elif self.system_service.is_processing and self.system_service.inference_start_time is not None:
                        self.system_service.latest_stats["mode"] = "RUNNING"
                        self.system_service.latest_stats["remaining_inference_sec"] = max(
                            0, int(INFERENCE_DURATION - (current_time - self.system_service.inference_start_time))
                        )
                        self.system_service.latest_stats["next_inference_in_sec"] = 0
                    else:
                        self.system_service.latest_stats["mode"] = "IDLE"
                        self.system_service.latest_stats["remaining_inference_sec"] = 0
                        self.system_service.latest_stats["next_inference_in_sec"] = max(
                            0, int(INFERENCE_INTERVAL - (current_time - self.system_service.last_inference_end))
                        )

                    self.system_service.output_frame = final_frame.copy()

            except Exception as e:
                print(f"⚠️ Camera thread error: {e}")
                time.sleep(0.2)

            time.sleep(0.005)
