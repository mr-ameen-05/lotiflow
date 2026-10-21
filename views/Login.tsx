import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Shield, AlertCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from '../services/useTheme';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: email.trim(), password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Invalid username or password');
            }

            const normalizedRole = (data.role || (email.includes('manager') ? 'manager' : 'analyst')).toUpperCase();
            localStorage.setItem('token', 'session-active');
            localStorage.setItem('userRole', normalizedRole);
            localStorage.setItem('userName', data.user?.name || email.split('@')[0]);
            localStorage.setItem('userEmail', data.user?.email || email);
            localStorage.setItem('userId', String(data.user?.id || ''));

            navigate('/overview');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-primary)',
                position: 'relative'
            }}
        >
            {/* Theme Toggle Button */}
            <button
                type="button"
                onClick={toggleTheme}
                className="btn btn-ghost"
                style={{
                    position: 'absolute',
                    top: '1.5rem',
                    right: '1.5rem',
                    borderRadius: '50%',
                    padding: '0.6rem',
                    boxShadow: 'var(--shadow-sm)'
                }}
                title="Toggle Theme"
            >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Login Card */}
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '440px',
                    padding: '2.25rem',
                    boxShadow: 'var(--shadow-md)',
                    border: 'var(--border)'
                }}
            >
                {/* Branding Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div
                        style={{
                            width: '54px',
                            height: '54px',
                            margin: '0 auto 1rem',
                            borderRadius: '14px',
                            background: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px var(--accent-soft)'
                        }}
                    >
                        <Shield size={28} color="#ffffff" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                        SOCflow
                    </h1>
                    <div
                        style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            color: 'var(--text-muted)',
                            marginTop: '0.25rem'
                        }}
                    >
                        Living-off-the-Land Detection Platform
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                    {error && (
                        <div
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius)',
                                background: 'var(--danger-soft)',
                                border: '1px solid var(--danger-border)',
                                color: 'var(--danger)',
                                fontSize: '0.82rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: 'var(--text-secondary)',
                                marginBottom: '0.4rem'
                            }}
                        >
                            Work Email
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail
                                size={16}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)',
                                    pointerEvents: 'none'
                                }}
                            />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                style={{ paddingLeft: '38px' }}
                                placeholder="analyst@socflow.local or manager@socflow.local"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: 'var(--text-secondary)',
                                marginBottom: '0.4rem'
                            }}
                        >
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock
                                size={16}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)',
                                    pointerEvents: 'none'
                                }}
                            />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                style={{ paddingLeft: '38px' }}
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    <div style={{ paddingTop: '0.25rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '0.7rem 1.25rem',
                                fontSize: '0.9rem',
                                borderRadius: 'var(--radius)'
                            }}
                        >
                            {loading ? (
                                <span>Authenticating...</span>
                            ) : (
                                <>
                                    <span>Sign In to SOCflow</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Pre-configured Demo Reference */}
                    <div
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem 0.9rem',
                            borderRadius: 'var(--radius)',
                            background: 'var(--bg-subtle)',
                            border: 'var(--border)',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)'
                        }}
                    >
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                            Quick Demo Logins:
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                            <span>manager@socflow.local</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>SOCflow2026!</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                            <span>analyst@socflow.local</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>SOCflow2026!</span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
