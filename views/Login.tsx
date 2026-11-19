import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { useTheme } from '../services/useTheme';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { theme: _theme } = useTheme();

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
        <div className="login-page">
            <div
                className="login-card card"
            >
                <div className="login-brand">
                    <div className="login-mark"><Shield size={24} color="#fff" /></div>
                    <p className="eyebrow">Security operations</p>
                    <h1>SOCflow</h1>
                    <p className="text-sm text-slate-500">Living-off-the-Land detection platform</p>
                </div>

                <div className="login-intro"><h2>Sign in to your workspace</h2><p>Use your assigned SOCflow account to continue.</p></div>
                <form onSubmit={handleLogin} className="login-form">
                    {error && <div role="alert" className="login-error">
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>}

                    <div>
                        <label className="login-label" htmlFor="login-email">
                            Work Email
                        </label>
                        <div className="login-control">
                            <Mail size={16} aria-hidden="true" />
                            <input
                                id="login-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                autoComplete="username"
                                placeholder="name@organization.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="login-label" htmlFor="login-password">
                            Password
                        </label>
                        <div className="login-control">
                            <Lock size={16} aria-hidden="true" />
                            <input
                                id="login-password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                autoComplete="current-password"
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <button type="submit" disabled={loading} className="btn btn-primary login-submit">
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

                </form>
                <p className="login-footnote">Protected access for authorized security personnel.</p>
            </div>
        </div>
    );
};

export default Login;
