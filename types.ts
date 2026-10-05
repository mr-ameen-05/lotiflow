
export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

export enum UserRole {
  MANAGER = 'MANAGER',
  ANALYST = 'ANALYST',
}

export interface ProcessEvent {
  id: string;
  timestamp: string;
  image: string;
  commandLine: string;
  parentImage: string;
  processId: number;
  parentProcessId: number;
  user: string;
  host: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  hostname: string;
  severity: Severity;
  ruleTriggered: string;
  confidence: number;
  commandLine: string;
  processId: number;
  parentProcessId: number;
  processName: string;
  status: 'NEW' | 'ACK' | 'RESOLVED' | 'IGNORED';
  eventId: string; // Reference to the raw process event
}

export interface CaseNote {
  id: string;
  timestamp: string;
  author: string;
  text: string;
}

export interface Artifact {
  id: string;
  timestamp: string;
  type: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
}
