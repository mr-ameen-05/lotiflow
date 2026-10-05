import os
import sys
import json
import subprocess
import socket

def print_banner():
    print("=" * 45)
    print("    SOCflow Agent Unified Installer (Python)")
    print("=" * 45)

def run_command(command):
    try:
        subprocess.check_call([sys.executable, "-m"] + command)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print_banner()

    # 1. Install Dependencies
    print("\n📦 Step 1: Installing dependencies...")
    if os.path.exists("requirements.txt"):
        if run_command(["pip", "install", "-r", "requirements.txt"]):
            print("✅ Dependencies installed successfully.")
        else:
            print("❌ Failed to install dependencies.")
            sys.exit(1)
    else:
        # Fallback if requirements.txt is missing
        print("⚠️ requirements.txt not found. Installing defaults...")
        run_command(["pip", "install", "requests", "psutil"])

    # 2. Server Configuration
    print("\n🔗 Step 2: Server Configuration")
    server_url = input("Enter SOCflow Server URL (e.g., http://192.168.1.5:8082): ").strip()
    
    if not server_url:
        print("❌ Server URL is required.")
        sys.exit(1)

    if not server_url.startswith("http"):
        server_url = f"http://{server_url}"
    
    if server_url.endswith("/"):
        server_url = server_url[:-1]

    # Quick connectivity check if possible
    try:
        from urllib.parse import urlparse
        parsed = urlparse(server_url)
        host = parsed.hostname
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        
        print(f"🔍 Checking connection to {host}:{port}...")
        with socket.create_connection((host, port), timeout=5):
            print("✅ Connection test successful!")
    except Exception as e:
        print(f"⚠️ Connection test failed/skipped: {e}")
        print("   Proceeding anyway, but verify your server is running.")

    # Save to agent_settings.json
    settings = {"server_url": server_url}
    with open("agent_settings.json", "w") as f:
        json.dump(settings, f, indent=4)
    print("✅ Configuration saved to agent_settings.json")

    # 3. Start Agent
    print("\n🚀 Step 3: Starting Agent...")
    try:
        subprocess.run([sys.executable, "agent_core.py"])
    except KeyboardInterrupt:
        print("\n👋 Agent stopped by user.")
    except Exception as e:
        print(f"❌ Failed to start agent: {e}")

if __name__ == "__main__":
    main()
