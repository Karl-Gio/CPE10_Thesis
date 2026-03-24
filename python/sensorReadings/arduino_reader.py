import serial
import threading
import time
import json 

class ArduinoReader:
    def __init__(self, port='/dev/ttyACM0', baud=9600): 
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
                    
                    # Siguraduhing mukhang JSON yung format
                    if line.startswith('{') and line.endswith('}'):
                        # I-convert ang text na JSON papunta sa Python Dictionary
                        parsed_data = json.loads(line)
                        
                        # I-update ang self.data
                        self.data["temp"] = parsed_data.get("temp", self.data["temp"])
                        self.data["hum"] = parsed_data.get("hum", self.data["hum"])
                        self.data["lux"] = parsed_data.get("lux", self.data["lux"])
                        self.data["sMOIST"] = parsed_data.get("sMOIST", self.data["sMOIST"])
                        self.data["sPH"] = parsed_data.get("sPH", self.data["sPH"])
                        
                except json.JSONDecodeError:
                    pass # Wag na natin i-print para hindi ma-spam ang terminal kung may putol na data
                except Exception as e:
                    print(f"❌ Serial Read Error: {e}")
            
            # Mabilis na pahinga para hindi mag-100% CPU usage ang Pi
            time.sleep(0.1) 

    def get_data(self):
        # Ito ang tatawagin ng api.py mo para kunin yung latest na data
        return self.data

    # ==========================================
    # BAGONG FUNCTION: Taga-padala sa Arduino
    # ==========================================
    def send_command(self, command_string):
        """
        Nagpapadala ng command string (e.g., "<24.5,75.0,500,40>") sa Arduino.
        """
        if self.ser and self.ser.is_open:
            try:
                # Importante ang .encode('utf-8') para maging bytes ang string
                self.ser.write(command_string.encode('utf-8'))
                print(f"✅ Successfully sent to Arduino: {command_string}")
                return True
            except Exception as e:
                print(f"❌ Failed to send command to Arduino: {e}")
                return False
        else:
            print("❌ Serial connection is not open.")
            return False

# --- PARA PANG-TEST KUNG GUMAGANA ---
if __name__ == "__main__":
    reader = ArduinoReader()
    reader.start()
    
    try:
        while True:
            print(reader.get_data())
            
            # Pwede mo rin i-test dito yung pag-send by uncommenting this:
            # reader.send_command("<28.5,75.0,500.0,40.0>")
            
            time.sleep(2) # Mag-print kada 2 segundo
    except KeyboardInterrupt:
        print("Exiting...")