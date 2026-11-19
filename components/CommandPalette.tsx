import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { filterNavigation } from '../services/navigation.js';

type Action = { path: string; label: string; icon: React.ReactNode; roles?: string[]; keywords?: string };

const CommandPalette: React.FC<{ open: boolean; actions: Action[]; role: string; onClose: () => void }> = ({ open, actions, role, onClose }) => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const matches = filterNavigation(actions, query, role) as Action[];

    useEffect(() => {
        if (!open) return;
        setQuery('');
        setActiveIndex(0);
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [open]);

    if (!open) return null;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') onClose();
        if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => (index + 1) % Math.max(matches.length, 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => (index - 1 + Math.max(matches.length, 1)) % Math.max(matches.length, 1)); }
        if (event.key === 'Enter' && matches[activeIndex]) { navigate(matches[activeIndex].path); onClose(); }
    };

    return <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/35 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-label="Search pages and actions" className="command-palette w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 px-4 border-b border-slate-100 dark:border-slate-800">
                <Search size={18} className="text-slate-400" aria-hidden="true" />
                <input ref={inputRef} value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleKeyDown} placeholder="Search pages and actions…" aria-label="Search pages and actions" className="h-14 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" />
                <kbd className="rounded-md border border-slate-200 px-1.5 py-1 text-[10px] text-slate-400 dark:border-slate-700">ESC</kbd>
            </div>
            <div className="p-2 max-h-[55vh] overflow-y-auto" role="listbox" aria-label="Available destinations">
                {matches.length ? matches.map((action, index) => <button key={action.path} type="button" role="option" aria-selected={activeIndex === index} onMouseEnter={() => setActiveIndex(index)} onClick={() => { navigate(action.path); onClose(); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${activeIndex === index ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}>
                    <span className="text-slate-500 dark:text-slate-400">{action.icon}</span><span className="flex-1">{action.label}</span><span className="text-[11px] text-slate-400">{action.path}</span>{activeIndex === index && <ArrowRight size={14} />}
                </button>) : <p className="px-3 py-8 text-center text-sm text-slate-500">No permitted destinations match “{query}”.</p>}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[10px] text-slate-400 dark:border-slate-800"><span>Search only includes pages available to your role.</span><span>↑ ↓ Navigate · Enter Open</span></div>
        </section>
    </div>;
};

export default CommandPalette;
