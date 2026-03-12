import serial
import threading
import time
import json # Pinalitan natin ang 're' ng 'json'

class ArduinoReader:
    def __init__(self, port='/dev/ttyACM0', baud=9600): # BINAGO ANG BAUD RATE TO 9600
        self.port = port
        self.baud = baud
        
        # Dito natin i-store lahat ng data para laging updated
        self.data = {
            "temp": 0.0,
            "hum": 0.0,
            "lux": 0.0,
            "sMOIST": 0.0,
            "sPH": 0.0
        }
        
        self.ser = None
        self.running = True
        self.connect()

    def connect(self):
        try:
            self.ser = serial.Serial(self.port, self.baud, timeout=1)
            self.ser.flush()
            print(f"✅ Arduino Connected on {self.port} at {self.baud} baud")
        except Exception as e:
            print(f"❌ Connection Error: {e}")
            self.ser = None

    def start(self):
        thread = threading.Thread(target=self._update, daemon=True)
        thread.start()

    def _update(self):
        while self.running:
            if self.ser and self.ser.in_waiting > 0:
                try:
                    # Basahin ang isang buong linya mula sa Arduino
                    line = self.ser.readline().decode('utf-8').strip()
                    
                    # Siguraduhing mukhang JSON yung format (nagsisimula sa { at nagtatapos sa })
                    if line.startswith('{') and line.endswith('}'):
                        # I-convert ang text na JSON papunta sa Python Dictionary
                        parsed_data = json.loads(line)
                        
                        # I-update ang self.data
                        self.data["temp"] = parsed_data.get("temp", self.data["temp"])
                        self.data["hum"] = parsed_data.get("hum", self.data["hum"])
                        self.data["lux"] = parsed_data.get("lux", self.data["lux"])
                        self.data["sMOIST"] = parsed_data.get("sMOIST", self.data["sMOIST"])
                        self.data["sPH"] = parsed_data.get("sPH", self.data["sPH"])
                        
                        # Tanggalin ang comment sa print para makita mo sa terminal kung pumapasok:
                        # print("Updated Data:", self.data)
                        
                except json.JSONDecodeError:
                    print("❌ Error: Hindi ma-parse ang JSON. Baka putol ang data.")
                except Exception as e:
                    print(f"❌ Serial Read Error: {e}")
            
            # Mabilis na pahinga para hindi mag-100% CPU usage ang Pi
            time.sleep(0.1) 

    def get_data(self):
        # Ito ang tatawagin ng api.py mo para kunin yung latest na data
        return self.data

# --- PARA PANG-TEST KUNG GUMAGANA ---
if __name__ == "__main__":
    reader = ArduinoReader()
    reader.start()
    
    try:
        while True:
            print(reader.get_data())
            time.sleep(2) # Mag-print kada 2 segundo
    except KeyboardInterrupt:
        print("Exiting...")