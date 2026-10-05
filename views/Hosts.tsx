import React from 'react';
import { Server } from 'lucide-react';

const Hosts = () => (
    <div className="flex flex-col gap-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Hosts Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View enrolled endpoints and agent status</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <Server size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Host Management View</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md">This view is currently under construction. Future updates will display all enrolled endpoints, heartbeat status, and agent details.</p>
        </div>
    </div>
);
export default Hosts;
