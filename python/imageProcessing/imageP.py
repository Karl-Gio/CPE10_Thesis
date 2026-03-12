import cv2
import numpy as np
from ultralytics import YOLO

class ImageP:
    def __init__(self, model_path="imageProcessing/best.pt"):
        try:
            self.model = YOLO(model_path)
            print("✅ YOLO Model Loaded!")
        except Exception as e:
            print(f"❌ YOLO Load Error: {e}")
            self.model = None

    def detect(self, frame, conf_threshold=0.5):
        if self.model is None:
            return [], 0, 0
        
        # Optimized for RPi5 speed
        results = self.model.predict(frame, conf=conf_threshold, verbose=False, imgsz=192, half=True)
        
        boxes_data = []
        count = len(results[0].boxes)
        avg_conf = 0
        
        if count > 0:
            conf_sum = 0
            for box in results[0].boxes:
                # Kunin ang coordinates [x1, y1, x2, y2]
                coords = box.xyxy[0].tolist() 
                conf = float(box.conf[0])
                conf_sum += conf
                boxes_list = [int(c) for c in coords]
                boxes_data.append({"coords": boxes_list, "conf": conf})
            
            avg_conf = round((conf_sum / count) * 100, 1)

        return boxes_data, count, avg_conf