#!/usr/bin/env python3
"""
SOCflow Connect — Automated Endpoint-to-Server Connection & Validation
========================================================================
Validates the full pipeline: Endpoint → Server → Database → Dashboard
Usage:
    python connect.py                          # Interactive mode
    python connect.py http://192.168.1.5:8082  # Direct mode
"""

import os
import sys
import json
import time
import socket
import platform
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(SCRIPT_DIR, "agent_settings.json")
CONFIG_FILE = os.path.join(SCRIPT_DIR, "agent_config.json")
SHARED_SECRET = "SOCflow-Enroll-2026!"

# ─── Helpers ────────────────────────────────────────────────────────
class Colors:
    GREEN  = "\033[92m"
    RED    = "\033[91m"
    YELLOW = "\033[93m"
    CYAN   = "\033[96m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    RESET  = "\033[0m"

def ok(msg):
    print(f"  {Colors.GREEN}✅ PASS{Colors.RESET}  {msg}")

def fail(msg, detail=""):
    print(f"  {Colors.RED}❌ FAIL{Colors.RESET}  {msg}")
    if detail:
        print(f"           {Colors.DIM}{detail}{Colors.RESET}")

def warn(msg):
    print(f"  {Colors.YELLOW}⚠️  WARN{Colors.RESET}  {msg}")

def info(msg):
    print(f"  {Colors.CYAN}ℹ️  INFO{Colors.RESET}  {msg}")

def header(title):
    w = 52
    print(f"\n{Colors.CYAN}{'═' * w}")
    print(f"  {title}")
    print(f"{'═' * w}{Colors.RESET}")

def step(n, title):
    print(f"\n{Colors.BOLD}  [{n}] {title}{Colors.RESET}")
    print(f"  {'─' * 44}")

def banner():
    print(f"""
{Colors.CYAN}{Colors.BOLD}
    ╔══════════════════════════════════════════╗
    ║        SOCflow Connect Validator         ║
    ║    Endpoint → Server → DB → Dashboard   ║
    ╚══════════════════════════════════════════╝{Colors.RESET}
    """)

# ─── Ensure requests is available ───────────────────────────────────
def ensure_requests():
    try:
        import requests
        return requests
    except ImportError:
        print(f"\n{Colors.YELLOW}📦 Installing 'requests' library...{Colors.RESET}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])
        import requests
        return requests

# ─── Get Server URL ─────────────────────────────────────────────────
def get_server_url():
    """Resolve server URL from: CLI arg > settings file > user input"""

    # 1. CLI argument
    if len(sys.argv) > 1:
        url = sys.argv[1]
        if not url.startswith("http"):
            url = f"http://{url}"
        info(f"Using CLI argument: {url}")
        return url

    # 2. Settings file
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                settings = json.load(f)
                if "server_url" in settings:
                    url = settings["server_url"]
                    # Strip /api suffix for base URL
                    if url.endswith("/api"):
                        url = url[:-4]
                    info(f"Loaded from agent_settings.json: {url}")
                    use_it = input(f"  Use this URL? [Y/n]: ").strip().lower()
                    if use_it in ("", "y", "yes"):
                        return url
        except Exception:
            pass

    # 3. User input
    print(f"\n  {Colors.BOLD}Enter the SOCflow Server URL{Colors.RESET}")
    print(f"  {Colors.DIM}Example: http://192.168.1.5:5001{Colors.RESET}")
    url = input(f"  → ").strip()

    if not url:
        print(f"\n{Colors.RED}  Server URL is required. Exiting.{Colors.RESET}")
        sys.exit(1)

    if not url.startswith("http"):
        url = f"http://{url}"

    # Add default port if missing
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if not parsed.port:
        url = f"{url}:5001"
        info(f"Added default port → {url}")

    return url


# ─── Validation Steps ───────────────────────────────────────────────
results = []

def record(name, passed, detail=""):
    results.append({"name": name, "passed": passed, "detail": detail})

def validate_network(url):
    """Step 1: TCP connectivity to the server host:port"""
    step(1, "Network Connectivity")

    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port or 5001

    # DNS resolution
    try:
        ip = socket.gethostbyname(host)
        ok(f"DNS resolved: {host} → {ip}")
        record("DNS Resolution", True)
    except socket.gaierror:
        fail(f"Cannot resolve hostname: {host}")
        record("DNS Resolution", False, f"Cannot resolve {host}")
        return False

    # TCP connection
    try:
        start = time.time()
        sock = socket.create_connection((host, port), timeout=5)
        elapsed = round((time.time() - start) * 1000)
        sock.close()
        ok(f"TCP connection to {host}:{port} ({elapsed}ms)")
        record("TCP Connection", True, f"{elapsed}ms")
        return True
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        fail(f"TCP connection to {host}:{port}", str(e))
        record("TCP Connection", False, str(e))
        warn("Check: Is the backend running? Is the firewall open?")
        return False


def validate_server_health(requests, url):
    """Step 2: Server health-check via /api/connection/verify"""
    step(2, "Server Health Check")

    try:
        start = time.time()
        r = requests.get(f"{url}/api/connection/verify", timeout=5)
        elapsed = round((time.time() - start) * 1000)

        if r.status_code == 200:
            data = r.json()
            ok(f"Server responded: {data.get('server', 'SOCflow')} ({elapsed}ms)")
            ok(f"Server time: {data.get('timestamp', 'N/A')}")
            record("Server Health", True, f"{elapsed}ms")
            return True
        else:
            fail(f"Server returned HTTP {r.status_code}", r.text[:100])
            record("Server Health", False, f"HTTP {r.status_code}")
            return False
    except Exception as e:
        fail("Server health-check failed", str(e))
        record("Server Health", False, str(e))
        return False


def validate_database(requests, url):
    """Step 3: Database connectivity via /api/hosts (requires DB)"""
    step(3, "Database Connection (via API)")

    try:
        r = requests.get(f"{url}/api/hosts", timeout=5)
        if r.status_code == 200:
            hosts = r.json()
            ok(f"Database reachable — {len(hosts)} host(s) registered")
            for h in hosts[:5]:
                status_color = Colors.GREEN if h.get('connectivity_status') == 'online' else Colors.RED
                info(f"  {h.get('hostname', '?'):20s}  {status_color}{h.get('connectivity_status','?').upper()}{Colors.RESET}  last_seen: {h.get('last_seen', 'never')}")
            record("Database", True, f"{len(hosts)} hosts")
            return True
        else:
            fail(f"API returned HTTP {r.status_code}", r.text[:100])
            record("Database", False, f"HTTP {r.status_code}")
            return False
    except Exception as e:
        fail("Database check failed", str(e))
        record("Database", False, str(e))
        return False


def validate_enrollment(requests, url):
    """Step 4: Agent enrollment test"""
    step(4, "Agent Enrollment")

    hostname = socket.gethostname()
    os_info = f"{platform.system()} {platform.release()} ({platform.machine()})"

    payload = {
        "hostname": hostname,
        "password": SHARED_SECRET,
        "os_info": os_info,
    }

    try:
        r = requests.post(f"{url}/api/enroll", json=payload, timeout=10, verify=False)
        if r.status_code == 200:
            data = r.json()
            agent_id = data.get("agent_id", "?")
            ok(f"Enrolled as: {hostname}")
            ok(f"Agent UUID: {agent_id}")

            # Save config
            with open(CONFIG_FILE, "w") as f:
                json.dump(data, f, indent=2)
            info(f"Config saved → {CONFIG_FILE}")
            record("Enrollment", True, f"ID: {agent_id}")
            return data
        else:
            fail(f"Enrollment rejected (HTTP {r.status_code})", r.text[:100])
            record("Enrollment", False, f"HTTP {r.status_code}")
            return None
    except Exception as e:
        fail("Enrollment failed", str(e))
        record("Enrollment", False, str(e))
        return None


def validate_telemetry(requests, url, agent_id):
    """Step 5: Send test telemetry and verify"""
    step(5, "Telemetry Pipeline")

    try:
        import psutil
        telemetry = {
            "agent_id": agent_id,
            "cpu": psutil.cpu_percent(),
            "ram": psutil.virtual_memory().percent,
            "disk": psutil.disk_usage(os.path.abspath(os.sep)).percent,
        }
    except ImportError:
        telemetry = {"agent_id": agent_id, "cpu": 5.0, "ram": 45.0, "disk": 60.0}
        warn("psutil not installed — using mock telemetry")

    try:
        r = requests.post(f"{url}/api/telemetry", json=telemetry, timeout=5, verify=False)
        if r.status_code == 200:
            ok(f"Telemetry accepted (CPU: {telemetry['cpu']}%, RAM: {telemetry['ram']}%)")
            record("Telemetry", True)
        else:
            fail(f"Telemetry rejected (HTTP {r.status_code})", r.text[:100])
            record("Telemetry", False, f"HTTP {r.status_code}")
    except Exception as e:
        fail("Telemetry send failed", str(e))
        record("Telemetry", False, str(e))


def validate_log_ingestion(requests, url, agent_id):
    """Step 6: Send test log and verify it appears"""
    step(6, "Log Ingestion Pipeline")

    test_log = {
        "agent_id": agent_id,
        "logs": [{
            "process_name": "connect_test.py",
            "command_line": "SOCflow connection validation test",
            "user": os.getenv("USER", os.getenv("USERNAME", "test_user")),
        }]
    }

    try:
        r = requests.post(f"{url}/api/logs", json=test_log, timeout=5, verify=False)
        if r.status_code == 200:
            data = r.json()
            ok(f"Log ingested: {data.get('count', 1)} event(s)")
            record("Log Ingestion", True)
        else:
            fail(f"Log rejected (HTTP {r.status_code})", r.text[:100])
            record("Log Ingestion", False, f"HTTP {r.status_code}")
    except Exception as e:
        fail("Log ingestion failed", str(e))
        record("Log Ingestion", False, str(e))


def validate_dashboard_data(requests, url):
    """Step 7: Verify data is available for the dashboard"""
    step(7, "Dashboard Data Availability")

    checks = [
        ("Agents List", "/api/agents"),
        ("Alerts Feed", "/api/alerts"),
        ("System Stats", "/api/stats"),
        ("Log Stream", "/api/logs/all"),
    ]

    all_ok = True
    for name, endpoint in checks:
        try:
            r = requests.get(f"{url}{endpoint}", timeout=5)
            if r.status_code == 200:
                data = r.json()
                count = len(data) if isinstance(data, list) else "ok"
                ok(f"{name}: {count}")
            else:
                fail(f"{name}: HTTP {r.status_code}")
                all_ok = False
        except Exception as e:
            fail(f"{name}: {e}")
            all_ok = False

    record("Dashboard Data", all_ok)


# ─── Save Settings ──────────────────────────────────────────────────
def save_settings(url):
    api_url = url if url.endswith("/api") else f"{url}/api"
    settings = {"server_url": api_url}
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=4)
    info(f"Settings saved → {SETTINGS_FILE}")


# ─── Summary Report ─────────────────────────────────────────────────
def print_summary():
    header("Validation Summary")
    passed = sum(1 for r in results if r["passed"])
    total = len(results)

    for r in results:
        icon = f"{Colors.GREEN}✅" if r["passed"] else f"{Colors.RED}❌"
        detail = f"  {Colors.DIM}({r['detail']}){Colors.RESET}" if r.get("detail") else ""
        print(f"  {icon} {r['name']}{Colors.RESET}{detail}")

    print(f"\n  {'─' * 44}")
    color = Colors.GREEN if passed == total else Colors.YELLOW if passed > total // 2 else Colors.RED

    print(f"  {color}{Colors.BOLD}{passed}/{total} checks passed{Colors.RESET}")

    if passed == total:
        print(f"\n  {Colors.GREEN}{Colors.BOLD}🎉 ALL SYSTEMS OPERATIONAL{Colors.RESET}")
        print(f"  {Colors.DIM}The agent is connected and data is flowing to the dashboard.{Colors.RESET}")
        print(f"  {Colors.DIM}Run 'python agent_core.py' to start continuous monitoring.{Colors.RESET}")
    elif passed > total // 2:
        print(f"\n  {Colors.YELLOW}⚠️  PARTIAL — Some checks need attention{Colors.RESET}")
    else:
        print(f"\n  {Colors.RED}🚨 CONNECTION ISSUES DETECTED{Colors.RESET}")
        print(f"  {Colors.DIM}Review the failures above and check:{Colors.RESET}")
        print(f"  {Colors.DIM}  1. Is the backend server running?{Colors.RESET}")
        print(f"  {Colors.DIM}  2. Is the IP/port correct and firewall open?{Colors.RESET}")
        print(f"  {Colors.DIM}  3. Is the MySQL database accessible?{Colors.RESET}")

    print()


# ─── Main ────────────────────────────────────────────────────────────
def main():
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    banner()
    requests = ensure_requests()
    url = get_server_url()

    # Clean URL
    if url.endswith("/"):
        url = url[:-1]
    if url.endswith("/api"):
        url = url[:-4]

    print(f"\n  {Colors.BOLD}Target: {Colors.CYAN}{url}{Colors.RESET}\n")

    # Run validation pipeline
    # Step 1: Network
    if not validate_network(url):
        record("Enrollment", False, "Skipped — no network")
        record("Telemetry", False, "Skipped — no network")
        record("Log Ingestion", False, "Skipped — no network")
        record("Dashboard Data", False, "Skipped — no network")
        print_summary()
        return

    # Step 2: Server health
    server_ok = validate_server_health(requests, url)

    # Step 3: Database
    db_ok = validate_database(requests, url)

    # Step 4: Enrollment
    agent_data = None
    if server_ok and db_ok:
        agent_data = validate_enrollment(requests, url)
    else:
        warn("Skipping enrollment — server/DB not ready")
        record("Enrollment", False, "Skipped")

    # Step 5 & 6: Telemetry + Logs
    if agent_data and "agent_id" in agent_data:
        validate_telemetry(requests, url, agent_data["agent_id"])
        validate_log_ingestion(requests, url, agent_data["agent_id"])
    else:
        if not agent_data:
            record("Telemetry", False, "Skipped — no agent")
            record("Log Ingestion", False, "Skipped — no agent")

    # Step 7: Dashboard data
    if server_ok:
        validate_dashboard_data(requests, url)
    else:
        record("Dashboard Data", False, "Skipped — server down")

    # Save settings on success
    if server_ok:
        save_settings(url)

    # Summary
    print_summary()

    # Offer to start agent
    passed = sum(1 for r in results if r["passed"])
    if passed == len(results):
        start = input(f"  {Colors.BOLD}Start the agent now? [Y/n]: {Colors.RESET}").strip().lower()
        if start in ("", "y", "yes"):
            print(f"\n  {Colors.CYAN}🚀 Launching agent_core.py...{Colors.RESET}\n")
            subprocess.run([sys.executable, os.path.join(SCRIPT_DIR, "agent_core.py"), f"{url}/api"])


if __name__ == "__main__":
    main()
