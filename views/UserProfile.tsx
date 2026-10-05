import React, { useState, useEffect } from 'react';
import { User, Server, Terminal } from 'lucide-react';

const UserProfile = () => {
    const [machines, setMachines] = useState<any[]>([]);
    const userRole = localStorage.getItem('userRole') || '';
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail') || '';
    const isManager = userRole === 'manager';

    useEffect(() => {
        if (isManager) fetchMachines();
    }, []);

    const fetchMachines = async () => {
        try {
            const res = await fetch('/api/hosts', { credentials: 'include' });
            if (res.ok) setMachines(await res.json());
        } catch { /* noop */ }
    };

    const roleLabel = isManager ? 'Manager' : 'SOC Analyst';
    const roleClass = isManager ? 'badge-warning' : 'badge-info';

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="page-title">Profile</div>
                    <div className="page-subtitle">Your account details and enrolled assets</div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '720px' }}>
                <div className="card-title"><User size={16} /> Account Details</div>
                <div className="row" style={{ gap: '1rem', alignItems: 'center' }}>
                    <div className="badge" style={{ width: '56px', height: '56px', borderRadius: '50%', fontSize: '1.25rem', padding: 0, justifyContent: 'center', background: 'var(--bg-subtle)', color: 'var(--accent)' }}>
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>{userName}</h3>
                        <p style={{ margin: '2px 0 6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{userEmail}</p>
                        <span className={`badge ${roleClass}`}>{roleLabel}</span>
                    </div>
                </div>
            </div>

            {isManager && (
                <>
                    <h2 className="page-title" style={{ fontSize: '1.05rem', margin: '1rem 0' }}>
                        <Server size={18} /> Enrolled Hosts
                    </h2>
                    {machines.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">No hosts enrolled yet. Use Systems &gt; Endpoints to download the agent.</div>
                        </div>
                    ) : (
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                            {machines.map((m: any) => (
                                <div key={m.host_id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                                    <Terminal size={64} style={{ position: 'absolute', top: 0, right: 0, opacity: 0.06 }} />
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.hostname}</div>
                                    <p className="mono" style={{ fontSize: '0.8rem', color: 'var(--info)', margin: '4px 0 10px' }}>{m.ip_address}</p>
                                    <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                                        <span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{m.status}</span>
                                        <span className="badge badge-neutral">{m.environment}</span>
                                        <span className="badge badge-neutral">{m.connectivity_status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {!isManager && (
                <div className="card" style={{ maxWidth: '720px' }}>
                    <div className="card-title">SOC Analyst Capabilities</div>
                    <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 2, margin: 0, paddingLeft: '1.25rem' }}>
                        <li>View and acknowledge security alerts</li>
                        <li>Manage incident investigation cases</li>
                        <li>Run advanced log queries in Log Explorer</li>
                        <li>Add forensic notes and link artifacts to cases</li>
                        <li>View vulnerability reports per host</li>
                        <li>Access the global threat map</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default UserProfile;
