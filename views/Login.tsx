import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, Shield } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Mock authentication based on email
        let role = 'ANALYST';
        if (email.includes('manager')) {
            role = 'MANAGER';
        }
        
        localStorage.setItem('userRole', role);
        localStorage.setItem('userName', email.split('@')[0] || 'User');
        localStorage.setItem('token', 'mock-jwt-token');
        
        navigate('/overview');
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-50 dark:bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-800 flex flex-col items-center">
                    <div className="bg-emerald-500 rounded-xl p-3 shadow-lg shadow-emerald-500/20 mb-4">
                        <Shield className="text-gray-900 dark:text-white" size={32} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">SOCflow Portal</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sign in to your account</p>
                </div>
                
                <form onSubmit={handleLogin} className="p-8 space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User size={16} className="text-gray-500" />
                            </div>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 text-gray-900 dark:text-white text-sm rounded-lg pl-10 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                placeholder="Enter your email (e.g. manager@soc.com)"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={16} className="text-gray-500" />
                            </div>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 text-gray-900 dark:text-white text-sm rounded-lg pl-10 px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    
                    <button 
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-gray-900 dark:text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors mt-2"
                    >
                        Sign In <ArrowRight size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
