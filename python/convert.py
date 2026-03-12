from ultralytics import YOLO

# I-load ang iyong dating model
model = YOLO("imageProcessing/best.pt")

# I-export sa format na mabilis para sa Raspberry Pi
model.export(format="ncnn")