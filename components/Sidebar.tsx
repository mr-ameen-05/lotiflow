import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { MANAGER_NAV_ITEMS, ANALYST_NAV_ITEMS, COLORS } from '../constants';

const Sidebar: React.FC = () => {
  const userRole = localStorage.getItem('userRole') || 'ANALYST'; // Default to ANALYST if empty for now
  const isManager = userRole === 'MANAGER';
  const NAV_ITEMS = isManager ? MANAGER_NAV_ITEMS : ANALYST_NAV_ITEMS;

  return (
    <aside className={`flex flex-col flex-shrink-0 w-64 border-r border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0 h-screen transition-all duration-300 z-20`}>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="bg-emerald-500 rounded-lg p-1.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Shield className="text-gray-900 dark:text-white" size={20} strokeWidth={2.5} />
        </div>
        <div>
            <div className="font-bold text-lg tracking-tight text-gray-900 dark:text-white leading-tight">SOCflow</div>
            <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest">Platform</div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:bg-gray-800 hover:text-gray-200'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-gray-800">
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Engine Online</span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
            {isManager ? 'Manager access active.' : 'Analyst access active.'}
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
