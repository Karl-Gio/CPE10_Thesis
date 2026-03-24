import serial
import threading
import time
import json

class ArduinoReader:
    def __init__(self, port='/dev/ttyACM0', baud=115200):
        self.port = port
        self.baud = baud
        self.ser = None
        self.running = True
        self.lock = threading.Lock() # Prevents race conditions during reconnect
        
        self.data = {
            "temp": 0.0, "hum": 0.0, "lux": 0.0,
            "sMOIST": 0.0, "sTEMP": 0.0, "pump": "OFF"
        }
        self.connect()

    def connect(self):
        """Attempts to open the serial port until successful."""
        while self.running:
            with self.lock:
                try:
                    print(f"🔄 Attempting to connect to {self.port}...")
                    self.ser = serial.Serial(self.port, self.baud, timeout=2)
                    self.ser.flush()
                    print(f"✅ Arduino Connected on {self.port}")
                    return True
                except Exception as e:
                    print(f"❌ Connection failed: {e}. Retrying in 3s...")
                    self.ser = None
            time.sleep(3)

    def _update(self):
        """Internal loop to read JSON data."""
        while self.running:
            if self.ser and self.ser.is_open:
                try:
                    if self.ser.in_waiting > 0:
                        line = self.ser.readline().decode('utf-8', errors='ignore').strip()
                        if line.startswith('{') and line.endswith('}'):
                            new_data = json.loads(line)
                            with self.lock:
                                self.data.update(new_data)
                except Exception as e:
                    print(f"⚠️ Serial Error: {e}")
                    self.handle_disconnect()
            else:
                self.handle_disconnect()
            time.sleep(0.1)

    def handle_disconnect(self):
        """Cleans up and attempts to reconnect."""
        with self.lock:
            if self.ser:
                self.ser.close()
            self.ser = None
        self.connect()

    def send_command(self, command):
        """Thread-safe command sending."""
        with self.lock:
            if self.ser and self.ser.is_open:
                try:
                    self.ser.write(command.encode('utf-8'))
                    return True
                except Exception as e:
                    print(f"❌ Write failed: {e}")
                    return False
        return False

    def start(self):
        t = threading.Thread(target=self._update, daemon=True)
        t.start()

    def get_data(self):
        with self.lock:
            return self.data