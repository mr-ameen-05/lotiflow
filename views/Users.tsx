import React, { useState, useEffect } from 'react';
import {
    Users as UsersIcon, UserPlus, Shield, CheckCircle,
    XCircle, Clock, Mail, Phone, RefreshCw
} from 'lucide-react';

const API_URL = '/api';

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(2); // 2 = Analyst, 1 = Manager
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users`, { credentials: 'include' });
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    full_name: fullName,
                    email,
                    password,
                    role_id: Number(roleId)
                })
            });

            if (res.ok) {
                setShowCreateModal(false);
                setFullName('');
                setEmail('');
                setPassword('');
                setMessage('Account created successfully.');
                setTimeout(() => setMessage(null), 3000);
                loadUsers();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create user');
            }
        } catch (err) {
            console.error('Failed to create account:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleUserStatus = async (userId: number, currentStatus: string) => {
        const nextStatus = currentStatus.toLowerCase() === 'active' ? 'inactive' : 'active';
        try {
            const res = await fetch(`${API_URL}/users/${userId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: nextStatus })
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, status: nextStatus.toUpperCase() } : u));
                setMessage(`User status updated to ${nextStatus}.`);
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (err) {
            console.error('Failed to update user status:', err);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        User Administration &amp; Access Control
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Manage SOC Manager and Analyst accounts with strict Role-Based Access Control
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm"
                    >
                        <UserPlus size={14} /> Provision User
                    </button>
                    <button
                        onClick={loadUsers}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                        title="Refresh Users"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {message && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-medium">
                    {message}
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wider bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3.5 font-semibold">User</th>
                                <th className="px-6 py-3.5 font-semibold">Assigned Role</th>
                                <th className="px-6 py-3.5 font-semibold">Status</th>
                                <th className="px-6 py-3.5 font-semibold">Last Authentication</th>
                                <th className="px-6 py-3.5 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {users.map((user) => {
                                const isActive = (user.status || '').toLowerCase() === 'active';
                                const isManager = (user.role || '').toLowerCase() === 'manager';
                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                                                    {user.initials || user.name?.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 dark:text-white">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Mail size={12} /> {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded border ${
                                                isManager
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                isActive
                                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                                            {user.last_login ? user.last_login.replace('T', ' ').slice(0, 19) : 'Never logged in'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => toggleUserStatus(user.id, user.status)}
                                                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                                                    isActive
                                                        ? 'text-red-500 hover:bg-red-500/10'
                                                        : 'text-emerald-500 hover:bg-emerald-500/10'
                                                }`}
                                            >
                                                {isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            Provision New User
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Create an account with role-based access for SOC operations.
                        </p>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g. Sarah Connor"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="e.g. sconnor@socflow.local"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Initial Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Assign Role</label>
                                <select
                                    value={roleId}
                                    onChange={(e) => setRoleId(Number(e.target.value))}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                >
                                    <option value={2}>SOC Analyst (Triage, Cases, Explorer)</option>
                                    <option value={1}>SOC Manager (Administration, Fleet, Rules)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-gray-950 transition-colors shadow-sm"
                                >
                                    {submitting ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
