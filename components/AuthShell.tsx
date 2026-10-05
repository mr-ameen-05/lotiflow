import React from 'react';
import { Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '../services/useTheme';

interface AuthShellProps {
    title: string;
    subtitle: string;
    accentColor: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, accentColor, children, footer }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg-app)', position: 'relative' }}>
            <button
                onClick={toggleTheme}
                className="btn btn-ghost"
                style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem' }}
                title="Toggle theme"
            >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{
                        width: '48px', height: '48px', margin: '0 auto 0.9rem', borderRadius: '12px',
                        background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Shield size={24} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>SOCflow</h1>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        LotL Detection Platform
                    </div>
                    <div style={{ margin: '1.25rem 0', height: '1px', background: 'var(--border-color)' }} />
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{subtitle}</p>
                </div>

                {children}

                {footer && <div style={{ marginTop: '1.25rem' }}>{footer}</div>}
            </div>
        </div>
    );
};

export default AuthShell;
