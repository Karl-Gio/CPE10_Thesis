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
        self.lock = threading.Lock()

        self.data = {
            "temp": 0.0,
            "hum": 0.0,
            "lux": 0.0,
            "sMOIST": 0.0,
            "sTEMP": 0.0,
            "pump": "OFF",
            "uv": "OFF",
            "ledw": "OFF",
            "tempMode": "IDLE",
            "humMode": "IDLE"
        }

        self.connect()

    def connect(self):
        while self.running:
            try:
                print(f"Attempting to connect to {self.port} ...")
                self.ser = serial.Serial(self.port, self.baud, timeout=2)
                time.sleep(3.0)
                self.ser.reset_input_buffer()
                print(f"Arduino connected on {self.port}")
                return True
            except Exception as e:
                print(f"Connection failed: {e}. Retrying in 3s...")
                self.ser = None
                time.sleep(3)

    def _update(self):
        while self.running:
            try:
                if self.ser and self.ser.is_open:
                    line = self.ser.readline().decode('utf-8', errors='ignore').strip()

                    # Remove noisy raw serial prints
                    # if line and "{" in line:
                    #     print("RAW:", repr(line))

                    if "{" in line and "}" in line:
                        try:
                            json_str = line[line.find("{"):line.rfind("}") + 1]
                            new_data = json.loads(json_str)

                            # Remove noisy parsed JSON prints
                            # print("JSON OK:", new_data)

                            with self.lock:
                                self.data.update(new_data)

                        except Exception as e:
                            print("JSON ERROR:", e, repr(line))
                else:
                    self.handle_disconnect()

            except Exception as e:
                print("Serial Error:", e)
                self.handle_disconnect()

            time.sleep(0.05)

        while self.running:
            try:
                if self.ser and self.ser.is_open:
                    line = self.ser.readline().decode('utf-8', errors='ignore').strip()

                    if line:
                        print("RAW:", repr(line))

                    if line.startswith('{') and line.endswith('}'):
                        try:
                            new_data = json.loads(line)
                            print("JSON OK:", new_data)
                            with self.lock:
                                self.data.update(new_data)
                        except Exception as e:
                            print("JSON ERROR:", e, repr(line))
                else:
                    self.handle_disconnect()

            except Exception as e:
                print("Serial Error:", e)
                self.handle_disconnect()

            time.sleep(0.05)

    def handle_disconnect(self):
        with self.lock:
            try:
                if self.ser:
                    self.ser.close()
            except Exception:
                pass
            self.ser = None

        self.connect()

    def send_command(self, command):
        with self.lock:
            if self.ser and self.ser.is_open:
                try:
                    self.ser.write((command + "\n").encode('utf-8'))
                    self.ser.flush()
                    print(f"Sent to Arduino: {command}")
                    return True
                except Exception as e:
                    print(f"Write failed: {e}")
                    return False
        return False

    def start(self):
        t = threading.Thread(target=self._update, daemon=True)
        t.start()

    def get_data(self):
        with self.lock:
            return dict(self.data)


if __name__ == "__main__":
    reader = ArduinoReader(port="/dev/ttyACM0", baud=115200)
    reader.start()

    while True:
        print("LATEST DATA:", reader.get_data())
        time.sleep(2)