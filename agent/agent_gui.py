import tkinter as tk
from tkinter import messagebox
import json
import os
import requests
import subprocess
import threading

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "agent_config.json")
SETTINGS_FILE = os.path.join(SCRIPT_DIR, "agent_settings.json")

def register_agent():
    server_ip = ip_entry.get().strip()
    enrollment_key = key_entry.get().strip()

    if not server_ip or not enrollment_key:
        messagebox.showerror("Error", "Please enter both Server IP and Enrollment Key.")
        return

    # Normalize Server URL
    if not server_ip.startswith("http"):
        server_ip = f"http://{server_ip}"
    server_url = f"{server_ip}:5001/api"

    # Save Settings
    with open(SETTINGS_FILE, "w") as f:
        json.dump({"server_url": server_url, "enrollment_key": enrollment_key}, f)

    status_label.config(text="Connecting to server...", fg="blue")
    
    # Attempt enrollment
    try:
        import socket
        import platform
        hostname = socket.gethostname()
        os_info = f"{platform.system()} {platform.release()}"
        
        payload = {
            "hostname": hostname,
            "password": enrollment_key,
            "os_info": os_info
        }
        
        response = requests.post(f"{server_url}/enroll", json=payload, timeout=10, verify=False)
        
        if response.status_code == 200:
            creds = response.json()
            with open(CONFIG_FILE, "w") as f:
                json.dump(creds, f)
            status_label.config(text=f"Success! Agent ID: {creds['agent_id']}", fg="green")
            messagebox.showinfo("Success", "Agent enrolled successfully!\nMonitoring will now start in the background.")
            
            # Launch agent_core.py in the background
            subprocess.Popen(["python", os.path.join(SCRIPT_DIR, "agent_core.py")])
            root.destroy()
        else:
            status_label.config(text="Enrollment Failed.", fg="red")
            messagebox.showerror("Enrollment Failed", f"Server returned {response.status_code}: {response.text}")

    except requests.exceptions.ConnectionError:
        status_label.config(text="Connection Error.", fg="red")
        messagebox.showerror("Connection Error", f"Could not reach {server_url}/enroll. Check your IP.")
    except Exception as e:
        status_label.config(text="Unexpected Error.", fg="red")
        messagebox.showerror("Error", str(e))

# Setup GUI
root = tk.Tk()
root.title("SOCflow Endpoint Setup")
root.geometry("400x250")
root.resizable(False, False)

tk.Label(root, text="SOCflow Agent Enrollment", font=("Helvetica", 14, "bold")).pack(pady=15)

frame = tk.Frame(root)
frame.pack(pady=5)

tk.Label(frame, text="Server IP (e.g. 192.168.1.50):").grid(row=0, column=0, sticky="e", pady=5, padx=5)
ip_entry = tk.Entry(frame, width=25)
ip_entry.grid(row=0, column=1, pady=5)

tk.Label(frame, text="Enrollment Key:").grid(row=1, column=0, sticky="e", pady=5, padx=5)
key_entry = tk.Entry(frame, width=25, show="*")
key_entry.grid(row=1, column=1, pady=5)

tk.Button(root, text="Connect & Enroll", command=lambda: threading.Thread(target=register_agent).start(), bg="#2563eb", fg="white", font=("Helvetica", 10, "bold"), padx=10, pady=5).pack(pady=10)

status_label = tk.Label(root, text="Waiting for input...", fg="gray")
status_label.pack()

root.mainloop()
