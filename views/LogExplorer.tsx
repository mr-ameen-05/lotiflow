import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Terminal, Clock, User, Monitor, Activity } from 'lucide-react';

const API_URL = '/api';

const LogExplorer = () => {
    const [searchParams, setSearchParams] = useState({ query: '', host: '', user: '', process: '' });
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(true);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/logs/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(searchParams)
            });
            setLogs(await res.json());
        } catch { /* noop */ }
        setLoading(false);
    };

    useEffect(() => { handleSearch(); }, []);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="page-title">Log Explorer</div>
                    <div className="page-subtitle">Advanced query engine for system telemetry and events</div>
                </div>
                <div className="row">
                    <button className="btn" onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={14} /> {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                    <button className="btn btn-primary" style={{ color: '#fff' }}>
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="card">
                    <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="stat-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Keyword Search</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="input" placeholder="Process name, command line..." style={{ paddingLeft: '32px' }}
                                    value={searchParams.query} onChange={e => setSearchParams({ ...searchParams, query: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="stat-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Host Selection</label>
                            <div style={{ position: 'relative' }}>
                                <Monitor size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="input" placeholder="Hostname" style={{ paddingLeft: '32px' }}
                                    value={searchParams.host} onChange={e => setSearchParams({ ...searchParams, host: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="stat-label" style={{ display: 'block', marginBottom: '0.4rem' }}>User Identity</label>
                            <div style={{ position: 'relative' }}>
                                <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="input" placeholder="Username" style={{ paddingLeft: '32px' }}
                                    value={searchParams.user} onChange={e => setSearchParams({ ...searchParams, user: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', color: '#fff' }}>Search Logs</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ maxHeight: '620px', overflowY: 'auto' }}>
                    <table className="table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr>
                                <th>Timestamp</th>
                                <th>Host</th>
                                <th>Process</th>
                                <th>Command Line</th>
                                <th>User</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5}><div className="empty-state"><Activity className="spin" style={{ margin: '0 auto 10px' }} /> Searching…</div></td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5}>
                                    <div className="empty-state">
                                        <Terminal size={40} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
                                        No telemetry events found matching your filter criteria.
                                    </div>
                                </td></tr>
                            ) : logs.map(log => (
                                <tr key={log.event_id} style={{ cursor: 'pointer' }}>
                                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                        <span className="row" style={{ gap: '6px' }}><Clock size={13} /> {new Date(log.timestamp).toLocaleString()}</span>
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.hostname}</td>
                                    <td><span className="code-block" style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent)' }}>{log.process_name}</span></td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', maxWidth: '480px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                        {log.command_line}
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{log.user_name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LogExplorer;
