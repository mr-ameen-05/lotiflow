
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, trend, trendUp, color = 'emerald' }) => {
    const accentVar = color === 'rose' ? 'var(--danger)' : color === 'amber' ? 'var(--warning)' : color === 'sky' ? 'var(--info)' : 'var(--success)';

    return (
        <div className="stat" style={{ padding: '1.5rem' }}>
            <div className="card-title">
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{title}</span>
                <Icon size={20} style={{ color: accentVar }} strokeWidth={2} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1, margin: 0 }}>{value}</h3>
                {trend && (
                    <span className={`badge ${trendUp ? 'badge-success' : 'badge-danger'}`}>{trendUp ? '+' : ''}{trend}</span>
                )}
            </div>
        </div>
    );
};

export default KPICard;
