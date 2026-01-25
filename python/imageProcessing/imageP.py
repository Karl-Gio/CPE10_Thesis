import cv2
import numpy as np
from ultralytics import YOLO

class ImageP:
    def __init__(self, model_path="best.pt"):
        try:
            self.model = YOLO(model_path)
            print("✅ YOLO Model Loaded!")
        except Exception as e:
            print(f"❌ YOLO Load Error: {e}")
            self.model = None

    def detect(self, frame, conf_threshold=0.45):
        if self.model is None:
            return frame, frame, 0, 0
        
        results = self.model.predict(frame, conf=conf_threshold, verbose=False, imgsz=320)
        count = len(results[0].boxes)
        avg_conf = 0
        
        if count > 0:
            conf_sum = sum([box.conf.item() for box in results[0].boxes])
            avg_conf = round((conf_sum / count) * 100, 1)

        annotated_frame = frame.copy()
        masked_frame = np.zeros_like(frame)

        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                masked_frame[y1:y2, x1:x2] = frame[y1:y2, x1:x2]

        return annotated_frame, masked_frame, count, avg_conf