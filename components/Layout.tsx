import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Shield, Server, Search, Bell, User,
    Briefcase, LogOut, Sun, Moon,
    Users, ShieldAlert, ClipboardList, FileText, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../services/useTheme';
import Sidebar from './Sidebar';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const userRole = localStorage.getItem('userRole') || '';
    const userName = localStorage.getItem('userName') || 'User';
    const isManager = userRole === 'MANAGER'; // Fixed role string case

    const getPageTitle = (path: string) => {
        if (path.includes('hosts')) return 'Hosts';
        if (path.includes('users')) return 'Users';
        if (path.includes('rules')) return 'Detection Rules';
        if (path.includes('audit')) return 'Audit Log';
        if (path.includes('reports')) return 'Reports';
        if (path.includes('alerts')) return 'Alerts';
        if (path.includes('cases')) return 'Cases';
        if (path.includes('explorer')) return 'Log Explorer';
        if (path.includes('profile')) return 'Profile';
        return 'Overview';
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        } catch { /* noop */ }
        ['token', 'userRole', 'userName', 'userEmail', 'userId'].forEach(k => localStorage.removeItem(k));
        navigate('/');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }} className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            <Sidebar />

            {/* Main column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Topbar */}
                <header style={{
                    height: '58px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 1.5rem', borderBottom: 'var(--border)', background: 'var(--bg-topbar)',
                    backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10
                }} className="border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }} className="text-gray-900 dark:text-white">
                        {getPageTitle(location.pathname)}
                    </div>

                    <div className="row flex items-center" style={{ gap: '0.5rem' }}>
                        <div style={{ position: 'relative', width: '260px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input type="text" className="input bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-700 rounded-md" placeholder="Search..." style={{ paddingLeft: '30px', paddingTop: '0.35rem', paddingBottom: '0.35rem' }} />
                        </div>
                        <button className="btn btn-ghost hover:bg-white dark:bg-gray-800 rounded-full" style={{ padding: '0.45rem' }}>
                            <Bell size={17} />
                        </button>
                        <button className="btn btn-ghost hover:bg-white dark:bg-gray-800 rounded-full" style={{ padding: '0.45rem' }} onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                        </button>
                        <NavLink to="/profile" className="row flex items-center hover:bg-white dark:bg-gray-800 rounded-full px-2 py-1" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500, paddingLeft: '0.5rem', textDecoration: 'none' }}>
                            <div style={{
                                width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-soft)',
                                color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 700, marginRight: '8px'
                            }} className="bg-gray-100 dark:bg-gray-700 text-emerald-400">
                                {userName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-800 dark:text-gray-300">{userName}</span>
                        </NavLink>
                        <button onClick={handleLogout} className="btn btn-ghost ml-2 hover:bg-white dark:bg-gray-800 rounded-full p-2" title="Sign Out">
                            <LogOut size={17} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white" />
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main style={{ flex: 1, overflowY: 'auto' }} className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
