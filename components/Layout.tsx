import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Command, LogOut, Menu, Moon, Search, Sun, X } from 'lucide-react';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import NotificationsPanel from './NotificationsPanel';
import { MANAGER_NAV_ITEMS, ANALYST_NAV_ITEMS } from '../constants';
import { useTheme } from '../services/useTheme';

const Layout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const role = (localStorage.getItem('userRole') || 'ANALYST').toUpperCase();
    const userName = localStorage.getItem('userName') || (role === 'MANAGER' ? 'Manager' : 'Analyst');
    const navItems = role === 'MANAGER' ? MANAGER_NAV_ITEMS : ANALYST_NAV_ITEMS;
    const current = useMemo(() => [...navItems].sort((a, b) => b.path.length - a.path.length).find(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)), [location.pathname, navItems]);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(value => !value); }
            if (event.key === 'Escape') { setPaletteOpen(false); setNotificationsOpen(false); setMobileOpen(false); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const signOut = () => {
        ['token', 'userRole', 'userName', 'userEmail', 'userId'].forEach(key => localStorage.removeItem(key));
        void fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
        navigate('/login', { replace: true });
    };

    return <div className="app-shell">
        <Sidebar open={mobileOpen} onNavigate={() => setMobileOpen(false)} />
        <div className="app-main">
            <header className="app-topbar">
                <div className="flex min-w-0 items-center gap-3">
                    <button className="icon-button md:hidden" type="button" onClick={() => setMobileOpen(value => !value)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
                    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{role === 'MANAGER' ? 'Manager workspace' : 'Analyst workspace'}</p><h1 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{current?.label || 'SOCflow'}</h1></div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPaletteOpen(true)} className="search-trigger" aria-label="Search pages"><Search size={16} /><span>Search</span><kbd><Command size={10} /> K</kbd></button>
                    <div className="relative"><button type="button" className="icon-button" aria-label="Recent alerts" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(value => !value)}><Bell size={18} /></button><NotificationsPanel open={notificationsOpen} role={role} onClose={() => setNotificationsOpen(false)} /></div>
                    <button type="button" onClick={toggleTheme} className="icon-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
                    <div className="topbar-user"><span className="user-avatar">{userName.trim().slice(0, 1).toUpperCase()}</span><span className="hidden min-w-0 sm:block"><span className="block max-w-32 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{userName}</span><span className="block text-[10px] text-slate-500">{role === 'MANAGER' ? 'Manager' : 'Analyst'}</span></span><button type="button" className="icon-button icon-button-small" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={15} /></button></div>
                </div>
            </header>
            <main className="app-content"><Outlet /></main>
        </div>
        <CommandPalette open={paletteOpen} actions={navItems} role={role} onClose={() => setPaletteOpen(false)} />
    </div>;
};

export default Layout;
