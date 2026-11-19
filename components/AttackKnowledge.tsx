import React, { useEffect, useState } from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';

type Technique = {
    id: string;
    name: string;
    description: string;
    url: string;
    tactics: string[];
    platforms: string[];
};

const AttackKnowledge: React.FC<{ technique?: string }> = ({ technique }) => {
    const [data, setData] = useState<{ source: string; techniques: Technique[]; fetched_at: string; stale: boolean } | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/attack/techniques', { credentials: 'include', signal: controller.signal })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(setData)
            .catch(() => { if (!controller.signal.aborted) setFailed(true); });
        return () => controller.abort();
    }, []);

    if (!technique) return null;
    const item = data?.techniques.find(entry => entry.id === technique);
    const mitreUrl = item?.url || `https://attack.mitre.org/techniques/${technique.replace('.', '/')}/`;

    return (
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2" aria-label="MITRE ATT&CK technique knowledge">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert size={15} className="text-emerald-500" />
                    {item?.name || `ATT&CK ${technique}`}
                </h3>
                <a href={mitreUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 shrink-0">
                    MITRE source <ExternalLink size={12} />
                </a>
            </div>
            {item ? (
                <>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                        {!!item.tactics.length && <span><strong>Tactics:</strong> {item.tactics.join(', ')}</span>}
                        {!!item.platforms.length && <span><strong>Platforms:</strong> {item.platforms.join(', ')}</span>}
                    </div>
                    {data?.fetched_at && <p className="text-[10px] text-gray-400">{data.source}{data.stale ? ' · cached copy' : ''} · Updated {new Date(data.fetched_at).toLocaleString()}</p>}
                </>
            ) : (
                <p className="text-xs text-gray-500">{failed ? 'Could not load ATT&CK details; open the MITRE source for this technique.' : 'Loading MITRE ATT&CK details…'}</p>
            )}
        </section>
    );
};

export default AttackKnowledge;
