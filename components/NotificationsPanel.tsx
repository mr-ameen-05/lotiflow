import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Bell, Clock } from 'lucide-react';

type Alert = { alert_id: number; severity: string; status: string; host?: string; rule_name?: string; description?: string; timestamp?: string };

const NotificationsPanel: React.FC<{ open: boolean; role: string; onClose: () => void }> = ({ open, role, onClose }) => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const isAnalyst = role === 'ANALYST';

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        fetch('/api/alerts', { credentials: 'include', signal: controller.signal })
            .then(response => response.ok ? response.json() : Promise.reject(new Error('Alert request failed')))
            .then(rows => setAlerts(Array.isArray(rows) ? rows.slice(0, 6) : []))
            .catch(() => { if (!controller.signal.aborted) setError(true); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [open]);

    if (!open) return null;
    const openTarget = (alertId?: number) => {
        navigate(isAnalyst && alertId ? `/alerts/${alertId}` : '/overview');
        onClose();
    };
    const newCount = alerts.filter(alert => alert.status === 'new').length;

    return <section className="notification-panel absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" aria-label="Recent alerts">
        <header className="flex items-start justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent alerts</h2><p className="mt-0.5 text-xs text-slate-500">{newCount} new in the latest results</p></div>
            <Bell size={17} className="mt-0.5 text-slate-400" aria-hidden="true" />
        </header>
        <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {loading ? <p className="px-4 py-8 text-center text-sm text-slate-500">Loading alerts…</p>
                : error ? <div className="px-4 py-8 text-center"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Alerts are unavailable</p><p className="mt-1 text-xs text-slate-500">Check your connection and try again.</p></div>
                : !alerts.length ? <div className="px-4 py-8 text-center"><AlertTriangle size={18} className="mx-auto mb-2 text-slate-400" /><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No alerts yet</p><p className="mt-1 text-xs text-slate-500">New detection alerts will appear here.</p></div>
                : alerts.map(alert => <button type="button" key={alert.alert_id} onClick={() => openTarget(alert.alert_id)} className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-600 dark:border-slate-800 dark:hover:bg-slate-800/70">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${alert.status === 'new' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`} aria-label={alert.status} />
                    <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className={`text-[10px] font-bold uppercase ${alert.severity === 'critical' ? 'text-rose-600' : alert.severity === 'high' ? 'text-orange-600' : 'text-slate-500'}`}>{alert.severity}</span><span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{alert.rule_name || alert.description || `Alert #${alert.alert_id}`}</span></span><span className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500"><Clock size={11} />{alert.host || 'Unknown host'} · {alert.timestamp?.replace('T', ' ').slice(0, 16) || 'Time unavailable'}</span></span>
                    <ArrowUpRight size={14} className="mt-1 shrink-0 text-slate-400" />
                </button>)}
        </div>
        <button type="button" onClick={() => openTarget()} className="w-full px-4 py-3 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">{isAnalyst ? 'Open alert queue' : 'Return to overview'}</button>
    </section>;
};

export default NotificationsPanel;
