import React, { useState, useEffect } from 'react';
import {
    Briefcase, Plus, Search, Filter, Clock, AlertTriangle, MessageSquare,
    CheckCircle, XCircle, ArrowLeft, Send, Activity, MoreHorizontal
} from 'lucide-react';

const API_URL = '/api';

const Cases = () => {
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCase, setSelectedCase] = useState<any>(null);
    const [showNewCaseModal, setShowNewCaseModal] = useState(false);
    const [search, setSearch] = useState('');

    const [newCaseTitle, setNewCaseTitle] = useState('');
    const [newCaseDesc, setNewCaseDesc] = useState('');
    const [newCasePriority, setNewCasePriority] = useState('medium');

    const [caseDetails, setCaseDetails] = useState<any>(null);
    const [newNote, setNewNote] = useState('');
    const [detailsLoading, setDetailsLoading] = useState(false);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/cases`, { credentials: 'include' });
            setCases(await res.json());
        } catch { /* noop */ }
        setLoading(false);
    };

    const fetchCaseDetails = async (id: number) => {
        setDetailsLoading(true);
        try {
            const res = await fetch(`${API_URL}/cases/${id}`, { credentials: 'include' });
            setCaseDetails(await res.json());
        } catch { /* noop */ }
        setDetailsLoading(false);
    };

    const handleCaseClick = (c: any) => {
        setSelectedCase(c);
        fetchCaseDetails(c.case_id);
    };

    const handleCreateCase = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/cases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title: newCaseTitle, description: newCaseDesc, priority: newCasePriority })
            });
            if (res.ok) {
                setShowNewCaseModal(false);
                setNewCaseDesc(''); setNewCaseTitle(''); setNewCasePriority('medium');
                fetchCases();
            }
        } catch { /* noop */ }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        try {
            const res = await fetch(`${API_URL}/cases/${selectedCase.case_id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ note_text: newNote })
            });
            if (res.ok) {
                setNewNote('');
                fetchCaseDetails(selectedCase.case_id);
            }
        } catch { /* noop */ }
    };

    const handleUpdateStatus = async (status: string) => {
        try {
            const res = await fetch(`${API_URL}/cases/${selectedCase.case_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchCases();
                fetchCaseDetails(selectedCase.case_id);
            }
        } catch { /* noop */ }
    };

    const priorityBadge = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'critical': return 'badge badge-danger';
            case 'high': return 'badge badge-warning';
            case 'medium': return 'badge badge-info';
            case 'low': return 'badge badge-success';
            default: return 'badge badge-neutral';
        }
    };

    const filteredCases = cases.filter(c =>
        !search || (c.title || '').toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
    );

    if (selectedCase && caseDetails) {
        return (
            <div className="page">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="row" style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
                        <button className="btn btn-ghost" onClick={() => setSelectedCase(null)} style={{ padding: '0.5rem' }}>
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="row" style={{ gap: '0.4rem', marginBottom: '0.4rem' }}>
                                <span className="badge badge-neutral">#{caseDetails.case_id}</span>
                                <span className={priorityBadge(caseDetails.priority)}>{caseDetails.priority}</span>
                                <span className={`badge ${caseDetails.status === 'open' ? 'badge-info' : 'badge-neutral'}`}>{caseDetails.status}</span>
                            </div>
                            <div className="page-title">{caseDetails.title}</div>
                        </div>
                    </div>
                    {caseDetails.status === 'open' ? (
                        <button className="btn btn-ghost" onClick={() => handleUpdateStatus('closed')} style={{ color: 'var(--text-muted)' }}>
                            <CheckCircle size={16} /> Close Case
                        </button>
                    ) : (
                        <button className="btn btn-ghost" onClick={() => handleUpdateStatus('open')} style={{ color: 'var(--success)' }}>
                            <Activity size={16} /> Reopen Case
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-3" style={{ alignItems: 'flex-start' }}>
                    <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="card">
                            <div className="card-title">Description</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{caseDetails.description}</p>
                            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: 'var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                <span className="row" style={{ gap: '6px' }}><Clock size={15} /> Created {new Date(caseDetails.created_at).toLocaleString()}</span>
                                <span className="row" style={{ gap: '6px' }}><AlertTriangle size={15} /> {caseDetails.alerts?.length || 0} Linked Alerts</span>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 0 }}>
                            <div style={{ padding: '0.9rem 1.25rem', borderBottom: 'var(--border)' }}>
                                <span className="card-title" style={{ margin: 0 }}>Linked Alerts</span>
                            </div>
                            <div>
                                {caseDetails.alerts && caseDetails.alerts.length > 0 ? (
                                    caseDetails.alerts.map((alert: any) => (
                                        <div key={alert.alert_id} className="row" style={{ padding: '0.8rem 1.25rem', borderBottom: '1px solid var(--border-color)', justifyContent: 'space-between' }}>
                                            <div className="row" style={{ gap: '0.75rem' }}>
                                                <span className="dot" style={{ background: 'var(--danger)' }}></span>
                                                <div>
                                                    <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{alert.rule_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alert.hostname} • {new Date(alert.timestamp).toLocaleString()}</div>
                                                </div>
                                            </div>
                                            <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{alert.status?.toUpperCase()}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">No alerts linked to this case yet.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '320px' }}>
                            <div style={{ paddingBottom: '0.9rem', borderBottom: 'var(--border)', marginBottom: '1rem' }}>
                                <span className="card-title" style={{ margin: 0 }}>Investigation Notes</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                                {caseDetails.notes && caseDetails.notes.length > 0 ? (
                                    caseDetails.notes.map((note: any) => (
                                        <div key={note.note_id} className="row" style={{ alignItems: 'flex-start', gap: '0.6rem' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                                                {note.analyst_name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{note.analyst_name}</span>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(note.created_at).toLocaleTimeString()}</span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '0.6rem 0.75rem', borderRadius: '8px' }}>{note.note_text}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">No notes added yet.</div>
                                )}
                            </div>
                            <form onSubmit={handleAddNote} className="row" style={{ gap: '0.5rem', paddingTop: '0.9rem', borderTop: 'var(--border)' }}>
                                <input type="text" className="input" placeholder="Add a note..." value={newNote} onChange={e => setNewNote(e.target.value)} />
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }} title="Add note">
                                    <Send size={15} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="page-title">Case Management</div>
                    <div className="page-subtitle">Track incidents and investigations</div>
                </div>
                <div className="row">
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" className="input" placeholder="Search cases..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', width: '240px' }} />
                    </div>
                    <button className="btn"><Filter size={15} /> Filter</button>
                    <button className="btn btn-primary" onClick={() => setShowNewCaseModal(true)}><Plus size={15} /> New Case</button>
                </div>
            </div>

            {loading ? (
                <div className="empty-state"><Activity className="spin" style={{ margin: '0 auto 10px' }} /> Loading cases...</div>
            ) : filteredCases.length === 0 ? (
                <div className="card" style={{ padding: '3rem' }}>
                    <div className="empty-state">
                        <Briefcase size={42} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>No cases found</div>
                        <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Create a case to start tracking incidents and investigations.</p>
                        <button className="btn btn-primary" onClick={() => setShowNewCaseModal(true)}><Plus size={15} /> Create First Case</button>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Case ID</th>
                                <th style={{ width: '34%' }}>Title</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th style={{ textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCases.map(c => (
                                <tr key={c.case_id} style={{ cursor: 'pointer' }} onClick={() => handleCaseClick(c)}>
                                    <td className="mono" style={{ color: 'var(--text-muted)' }}>#{c.case_id}</td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>
                                    </td>
                                    <td><span className={priorityBadge(c.priority)}>{c.priority}</span></td>
                                    <td>
                                        <span className="row" style={{ gap: '6px' }}>
                                            <span className={`dot ${c.status === 'open' ? 'dot-info' : 'dot-muted'}`}></span>
                                            <span className="badge badge-neutral" style={{ textTransform: 'none' }}>{c.status}</span>
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn btn-ghost" style={{ padding: '0.4rem' }}><MoreHorizontal size={15} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showNewCaseModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <span className="modal-title">Create New Case</span>
                            <button className="btn btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setShowNewCaseModal(false)}><XCircle size={18} /></button>
                        </div>
                        <form onSubmit={handleCreateCase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="stat-label" style={{ marginBottom: '0.35rem', display: 'block' }}>Title</label>
                                <input type="text" className="input" placeholder="e.g., Suspicious PowerShell Activity on HR-PC" value={newCaseTitle} onChange={e => setNewCaseTitle(e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-2">
                                <div>
                                    <label className="stat-label" style={{ marginBottom: '0.35rem', display: 'block' }}>Priority</label>
                                    <select className="select" value={newCasePriority} onChange={e => setNewCasePriority(e.target.value)}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="stat-label" style={{ marginBottom: '0.35rem', display: 'block' }}>Assignee</label>
                                    <select className="select" disabled>
                                        <option>Unassigned</option>
                                        <option>Me (Current User)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="stat-label" style={{ marginBottom: '0.35rem', display: 'block' }}>Description</label>
                                <textarea className="textarea" placeholder="Describe the incident details..." value={newCaseDesc} onChange={e => setNewCaseDesc(e.target.value)} required></textarea>
                            </div>
                            <div className="row" style={{ justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" onClick={() => setShowNewCaseModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary"><MessageSquare size={14} /> Create Case</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cases;
