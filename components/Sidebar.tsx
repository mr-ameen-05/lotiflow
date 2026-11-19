import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { MANAGER_NAV_ITEMS, ANALYST_NAV_ITEMS } from '../constants';

type SidebarProps = { open?: boolean; onNavigate?: () => void };

const Sidebar: React.FC<SidebarProps> = ({ open = false, onNavigate }) => {
    const role = (localStorage.getItem('userRole') || 'ANALYST').toUpperCase();
    const isManager = role === 'MANAGER';
    const navItems = isManager ? MANAGER_NAV_ITEMS : ANALYST_NAV_ITEMS;
    const groups: [string, string[]][] = isManager
        ? [['Workspace', ['overview']], ['Fleet', ['hosts']], ['Administration', ['users', 'rules']], ['Governance', ['audit', 'reports']], ['Account', ['profile']]]
        : [['Workspace', ['overview']], ['Triage', ['alerts']], ['Investigate', ['cases', 'explorer']], ['Account', ['profile']]];

    return (
        <>
            {open && <button aria-label="Close navigation" onClick={onNavigate} className="fixed inset-0 z-30 bg-slate-950/30 md:hidden" />}
            <aside className={`app-sidebar ${open ? 'app-sidebar-open' : ''}`} aria-label="Primary navigation">
                <NavLink to="/overview" onClick={onNavigate} className="flex items-center gap-3 px-5 h-[68px] border-b border-[var(--border-color)] no-underline">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white"><ShieldCheck size={20} /></span>
                    <span className="min-w-0"><span className="block text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">SOCflow</span><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Security operations</span></span>
                </NavLink>

                <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Workspace">
                    {groups.map(([label, ids]) => {
                        const items = navItems.filter(item => ids.includes(item.id));
                        if (!items.length) return null;
                        return <section key={label} className="mb-5">
                            <h2 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{label}</h2>
                            <div className="space-y-1">{items.map(item => <NavLink key={item.id} to={item.path} end onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
                                <span className="shrink-0">{item.icon}</span><span>{item.label}</span>
                            </NavLink>)}</div>
                        </section>;
                    })}
                </nav>

                <div className="p-4 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 px-3 py-3">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                        <div><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{isManager ? 'Manager workspace' : 'Analyst workspace'}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">Role-based access active</p></div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
