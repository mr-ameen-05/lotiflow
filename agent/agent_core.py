import os
import json
import socket
import time
import requests
import psutil
import platform
import urllib3
import sys

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "agent_config.json")
SETTINGS_FILE = os.path.join(SCRIPT_DIR, "agent_settings.json")

# Default to localhost, but try to load from settings
SERVER_API = "http://127.0.0.1:5001/api"
ENROLLMENT_KEY = "SOCflow-Enroll-2026!" # Fallback default

# 1. Load from settings file if it exists
if os.path.exists(SETTINGS_FILE):
    try:
        with open(SETTINGS_FILE, "r") as f:
            settings = json.load(f)
            if "server_url" in settings:
                SERVER_API = settings["server_url"]
            if "enrollment_key" in settings:
                ENROLLMENT_KEY = settings["enrollment_key"]
    except Exception as e:
        print(f"⚠️ Failed to load settings: {e}")

# 2. Override with command-line argument if provided
if len(sys.argv) > 1:
    arg = sys.argv[1]
    if arg.startswith("http"):
        SERVER_API = arg
    else:
        # Assume it's just an IP or hostname
        SERVER_API = f"http://{arg}:5001/api"
    print(f"🎮 Command-line override: {SERVER_API}")

# 3. Normalization: Ensure no trailing slash and includes /api
if SERVER_API.endswith('/'): 
    SERVER_API = SERVER_API[:-1]
if not SERVER_API.endswith('/api'): 
    SERVER_API += "/api"

print(f"🔗 Using Server API: {SERVER_API}")

def get_os_info():
    try:
        return f"{platform.system()} {platform.release()} ({platform.machine()})"
    except:
        return "Unknown OS"

def register_with_server():
    """Performs the first-time handshake with the server."""
    hostname = socket.gethostname()
    os_info = get_os_info()
    print(f"🔵 Attempting to register {hostname} ({os_info})...")

    payload = {
        "hostname": hostname,
        "password": ENROLLMENT_KEY,
        "os_info": os_info
    }

    try:
        print(f"📡 Sending registration request to {SERVER_API}/enroll...")
        response = requests.post(f"{SERVER_API}/enroll", json=payload, timeout=10, verify=False)
        
        if response.status_code == 200:
            creds = response.json()
            # Save the received ID and Key locally
            with open(CONFIG_FILE, "w") as f:
                json.dump(creds, f)
            print(f"✅ Registration Success! Assigned ID: {creds['agent_id']}")
            return creds
        else:
            print(f"❌ Registration Failed (HTTP {response.status_code}): {response.text}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error: Could not reach server at {SERVER_API}.")
        print(f"   Please check if the Server is running and accessible from this machine.")
        return None
    except Exception as e:
        print(f"❌ Registration Error: {e}")
        return None
def collect_logs():
    """Reads logs from Microsoft-Windows-Sysmon/Operational (Event ID 1) using pywin32."""
    logs = []
    try:
        import win32evtlog
        import xml.etree.ElementTree as ET
        
        # Structural mock of win32evtlog API usage for Sysmon Event ID 1
        # In a real environment, you would use:
        # query = '*[System[(EventID=1)]]'
        # handle = win32evtlog.EvtQuery('Microsoft-Windows-Sysmon/Operational', win32evtlog.EvtQueryForwardDirection, query)
        # events = win32evtlog.EvtNext(handle, 50)
        # 
        # for event in events:
        #     xml_str = win32evtlog.EvtRender(event, win32evtlog.EvtRenderEventXml)
        #     root = ET.fromstring(xml_str)
        #     # Extract elements from the Sysmon XML schema
        #     process_name = root.find('.//{*}Data[@Name="Image"]').text
        #     command_line = root.find('.//{*}Data[@Name="CommandLine"]').text
        #     user = root.find('.//{*}Data[@Name="User"]').text
        #
        #     logs.append({
        #         "process_name": process_name,
        #         "command_line": command_line,
        #         "user": user
        #     })

        # Since this is a structural mock, we'll simulate returning events
        # simulating a batch of up to 50 events
        for _ in range(50):
            logs.append({
                "process_name": "cmd.exe",
                "command_line": "cmd.exe /c echo 'Mock Event'",
                "user": "SYSTEM"
            })
            if len(logs) >= 50:
                break
    except ImportError:
        print("pywin32 not installed or not on Windows. Mocking log collection.")
    except Exception as e:
        print(f"Event Log error: {e}")
            
    return logs

def start_monitoring():
    # 1. Check if we are already registered
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                config = json.load(f)
        except Exception as e:
            print(f"⚠️ Failed to load config: {e}. Re-registering...")
            config = register_with_server()
    else:
        # If not, try to register
        config = register_with_server()
    
    if not config or 'agent_id' not in config:
        print("❌ Agent could not be initialized. Stopping.")
        return

    # 2. Main Loop
    print("🚀 Agent started monitoring...")
    while True:
        try:
            # Gather Telemetry
            telemetry = {
                "agent_id": config['agent_id'],
                "cpu": psutil.cpu_percent(),
                "ram": psutil.virtual_memory().percent,
                "disk": psutil.disk_usage(os.path.abspath(os.sep)).percent
            }
        except Exception as e:
            print(f"⚠️ Telemetry gathering error: {e}")
            telemetry = {
                "agent_id": config['agent_id'],
                "cpu": 0,
                "ram": 0,
                "disk": 0
            }
        
        # Gather Logs
        logs = collect_logs()

        # Send Data to Server
        try:
            # Send Telemetry
            requests.post(f"{SERVER_API}/telemetry", json=telemetry, timeout=5, verify=False)
            print(f"📡 Sent Telemetry: CPU {telemetry['cpu']}%")

            # Send Logs
            if logs:
                requests.post(f"{SERVER_API}/logs", json={"agent_id": config['agent_id'], "logs": logs}, timeout=5, verify=False)
                print(f"📝 Sent {len(logs)} log events")

        except requests.exceptions.ConnectionError:
            print(f"❌ Connection Error: Could not reach server at {SERVER_API}.")
            print(f"   Check your network connection and server IP.")
        except Exception as e:
             print(f"❌ Network Error during data transmission: {e}")

        time.sleep(10)

if __name__ == "__main__":
    start_monitoring()
