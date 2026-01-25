import serial
import threading
import time
import re

class SHT45Sensor:
    def __init__(self, port='/dev/ttyACM0', baud=115200):
        self.port = port
        self.baud = baud
        self.temp = 0.0
        self.humid = 0.0
        self.ser = None
        self.running = True
        self.connect()

    def connect(self):
        try:
            self.ser = serial.Serial(self.port, self.baud, timeout=1)
            self.ser.flush()
            print(f"✅ SHT45 Connected on {self.port}")
        except Exception as e:
            print(f"❌ SHT45 Connection Error: {e}")
            self.ser = None

    def start(self):
        thread = threading.Thread(target=self._update, daemon=True)
        thread.start()

    def _update(self):
        while self.running:
            if self.ser and self.ser.in_waiting > 0:
                try:
                    line = self.ser.readline().decode('utf-8').rstrip()
                    # Kumukuha ng lahat ng decimal numbers mula sa text string
                    numbers = re.findall(r"[-+]?\d*\.\d+|\d+", line)
                    
                    if len(numbers) >= 2:
                        self.temp = float(numbers[0])
                        self.humid = float(numbers[1])
                        # Makikita mo ito sa Pi terminal kung working
                        print(f"Parsed Data -> Temp: {self.temp}, Hum: {self.humid}")
                except Exception as e:
                    print(f"Parsing Error: {e}")
            
            # 0.5 seconds gap para hindi ma-overload ang CPU
            time.sleep(0.5)

    def get_data(self):
        return {
            "temperature": self.temp,
            "humidity": self.humid
        }