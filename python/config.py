from datetime import datetime, date

W = 640
H = 480
CONFIDENCE_THRESHOLD = 0.45
SKIP_FRAMES = 3
DATASET_FOLDER = "CapturedImage"

ARDUINO_PORT = "/dev/ttyACM0"
ARDUINO_BAUD = 115200
    
LARAVEL_API_URL = "http://127.0.0.1:8000/api/public/parameters"
LARAVEL_UPDATE_GERMINATION_DATE_URL = "http://127.0.0.1:8000/api/public/batches/germination-date"
TESTING_VALUES_API_URL = "http://127.0.0.1:8000/api/testing-values"
ACTIVE_CONFIG_URL = "http://127.0.0.1:8000/api/configurations/active"
BATCHES_API_BASE = "http://127.0.0.1:8000/api/batches"

# INFERENCE_INTERVAL = 9600
INFERENCE_INTERVAL = 60
INFERENCE_DURATION = 30

GERMINATION_MIN_COUNT = 1
GERMINATION_CONFIRM_FRAMES = 3

DEFAULT_PARAMS = {
    "batch": "Batch A",
    "datePlanted": datetime.now().strftime("%Y-%m-%d"),
    "totalSeeds": 30,
    "programDays": 7,
    "ambientTemp": 25.0,
    "ambientHum": 70.0,
    "soilMoisture": 35.0,
    "soilTemp": 22.0,
    "uvStart24": "07:00",
    "uvDurationMinutes": 120,
    "ledStart24": "17:00",
    "ledEnd24": "06:00",
    "ledDuration": 360
}

DEFAULT_STATS = {
    "temp": 0.0,
    "hum": 0.0,
    "lux": 0.0,
    "sMOIST": 0.0,
    "sTEMP": 0.0,
    "pechay_detected": 0,
    "pump": "OFF",
    "uv": "OFF",
    "ledw": "OFF",
    "tempMode": "IDLE",
    "humMode": "IDLE",
    "camera_active": False,
    "is_processing": False,
    "view_mode": "normal",
    "confidenceScore": 0,
    "last_saved_at": None,
    "mode": "IDLE",
    "next_inference_in_sec": 0,
    "remaining_inference_sec": 0,
    "manual_override": False,
    "germination_confirm_counter": 0,
    "germination_saved": False,
    "batch": "Batch A",
    "model_loaded": False
}