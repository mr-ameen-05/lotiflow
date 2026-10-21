import React from 'react';
import ManagerDashboard from './ManagerDashboard';
import AnalystDashboard from './AnalystDashboard';

const Overview: React.FC = () => {
    const rawRole = localStorage.getItem('userRole') || 'ANALYST';
    const isManager = rawRole.toUpperCase() === 'MANAGER';

    return isManager ? <ManagerDashboard /> : <AnalystDashboard />;
};

export default Overview;
