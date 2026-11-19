import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, ArrowLeft, Clock, FileText, Send, Shield, AlertTriangle } from 'lucide-react';

const CaseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const load = async () => {
        setLoading(true);
        try { const response = await fetch(`/api/cases/${id}`, { credentials: 'include' }); if (!response.ok) throw new Error(response.status === 404 ? 'Case not found.' : 'Case details are unavailable.'); setItem(await response.json()); setError(''); }
        catch (reason) { setItem(null); setError(reason instanceof Error ? reason.message : 'Case details are unavailable.'); } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [id]);
    const addNote = async (event: React.FormEvent) => {
        event.preventDefault(); if (!note.trim()) return; setSaving(true);
        try { const response = await fetch(`/api/cases/${id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ note_text: note.trim() }) }); if (response.ok) { setNote(''); await load(); } }
        catch { setError('Could not add the note. Check your connection and try again.'); } finally { setSaving(false); }
    };
    const updateStatus = async (status: string) => {
        const response = await fetch(`/api/cases/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status }) });
        if (response.ok) await load(); else setError('Could not update the case status.');
    };
    return (
        <div className="page max-w-6xl mx-auto">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <button onClick={() => navigate('/cases')} className="hover:text-gray-900 dark:text-white transition-colors flex items-center gap-1">
                    <ArrowLeft size={16} /> Back to Cases
                </button>
                <span>/</span>
                <span className="text-gray-800 dark:text-gray-300 font-medium">{id}</span>
            </div>
            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            {loading ? <div className="card empty-state">Loading case details…</div> : !item ? null : <>
                <section className="card flex flex-wrap items-start justify-between gap-4">
                    <div><div className="mb-2 flex items-center gap-2"><span className="badge badge-info">Case #{item.case_id}</span><span className={`badge ${item.status === 'closed' ? 'badge-neutral' : 'badge-success'}`}>{(item.status || 'open').replace('_', ' ')}</span><span className="badge badge-warning">{item.priority || 'medium'} priority</span></div><h1 className="page-title text-xl">{item.title}</h1><p className="page-subtitle">{item.description || 'No case description provided.'}</p><p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock size={13} /> Created {item.created_at?.replace('T', ' ').slice(0, 19) || 'date unavailable'}</p></div>
                    <div className="flex gap-2"><button className="btn" onClick={() => updateStatus(item.status === 'closed' ? 'open' : 'closed')}>{item.status === 'closed' ? 'Reopen case' : 'Close case'}</button></div>
                </section>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <section className="card"><h2 className="card-title"><Shield size={15} /> Linked alerts ({item.alerts?.length || 0})</h2>{item.alerts?.length ? <div className="space-y-2">{item.alerts.map((alert: any) => <button key={alert.alert_id} onClick={() => navigate(`/alerts/${alert.alert_id}`)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border-color)] p-3 text-left hover:bg-[var(--bg-hover)]"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{alert.rule_name || alert.description || `Alert #${alert.alert_id}`}</span><span className="mt-1 block text-xs text-slate-500">{alert.host || 'Unknown host'} · {alert.timestamp?.slice(0, 16) || 'Time unavailable'}</span></span><span className="badge badge-danger">{alert.severity || 'unknown'}</span></button>)}</div> : <p className="empty-state">No alerts are linked to this case.</p>}</section>
                    <section className="card"><h2 className="card-title"><FileText size={15} /> Investigation notes ({item.notes?.length || 0})</h2><div className="mb-4 max-h-72 space-y-3 overflow-y-auto">{item.notes?.length ? item.notes.map((entry: any) => <article key={entry.note_id} className="rounded-lg bg-[var(--bg-subtle)] p-3"><p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{entry.note_text}</p><p className="mt-2 text-[11px] text-slate-500">{entry.analyst_name || 'Analyst'} · {entry.created_at?.replace('T', ' ').slice(0, 16) || ''}</p></article>) : <p className="text-sm text-slate-500">No notes have been added.</p>}</div><form onSubmit={addNote} className="flex gap-2"><input className="input" aria-label="Add investigation note" value={note} onChange={event => setNote(event.target.value)} placeholder="Add an investigation note…" /><button type="submit" className="btn btn-primary" disabled={saving || !note.trim()}><Send size={14} /> Add</button></form></section>
                </div>
            </>}
        </div>
    );
};
export default CaseDetail;
