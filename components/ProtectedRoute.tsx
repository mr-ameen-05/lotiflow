import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const token    = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole')?.toUpperCase();

    if (!token || !userRole) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to="/overview" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
