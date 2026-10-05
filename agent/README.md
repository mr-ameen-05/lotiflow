# 🛡️ LOTIflow Endpoint Installation Guide

This guide will help you install and connect the monitoring agent to your Windows workstation.

## 📋 Prerequisites
- **Python 3.8+**: Ensure Python is installed and added to your system PATH.
- **Administrator Privileges**: Required to install monitoring hooks and background services.

---

## 🚀 Step 1: Prepare the Environment
1.  **Download/Extract** the agent folder from the LOTIflow dashboard.
2.  Open **PowerShell as Administrator**.
3.  (Optional) If you get a script execution error, run this command to allow the installer:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```

## 🛠️ Step 2: Run the Installer
1.  **Run the Installer**:
    - **Windows**: Right-click `install.ps1` and select **Run with PowerShell**, or run it from your terminal:
      ```powershell
      .\install.ps1
      ```
    - **Alternative (Recommended)**: Use the unified Python installer (works on Windows/Linux):
      ```bash
      python install.py
      ```
3.  The script will:
    - Check for Python.
    - Install necessary libraries (`psutil`, `requests`).
    - Test your connection to the server.

---

## 🔗 Step 3: Connect to the Server
1.  When prompted: "Please enter the Full Server API URL", type your server's address.
    - *Example:* `http://192.168.1.5:5001`
2.  The script will verify the connection and register your machine.
3.  Wait for the message: **✅ Registration Success!**

### 💡 VM Tip: Dynamic IP Support
If you are running the server on a Virtual Machine with a changing IP, you can skip the configuration file and run the agent directly with the IP as an argument:

```bash
python3 agent_core.py [YOUR_VM_IP]
```
*Example:* `python3 agent_core.py 192.168.1.75`

---

## �️ Step 4: Run Simulation (Demo)
To see the LOTIflow agent in action, you can run the attack simulation script. This will perform common "Living Off The Land" (LOTL) techniques that the agent will detect and report.

1.  While the agent is running in one terminal, open a **second terminal**.
2.  Navigate to the `agent` folder.
3.  Run the simulation:
    ```bash
    python3 simulate_attack.py
    ```
4.  **Check your Dashboard**: You should see new alerts appearing in the **Alert Center**.

---

## 🆘 Troubleshooting
- **Cannot reach server?** Ensure the server IP is correct and port `5001` is open in the server's firewall.
- **Python not found?** Download it from [python.org](https://www.python.org/) and make sure to check "Add Python to PATH" during installation.
- **Window closes too fast?** I've updated the script to stay open on errors. Look for the `❌` icon to find the exact failure reason.
