import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './views/Login';
import Overview from './views/Overview';
import UserProfile from './views/UserProfile';

// Manager
import Hosts from './views/Hosts';
import Users from './views/Users';
import Rules from './views/Rules';
import Audit from './views/Audit';
import Reports from './views/Reports';

// Analyst
import Alerts from './views/Alerts';
import AlertDetail from './views/AlertDetail';
import Cases from './views/Cases';
import CaseDetail from './views/CaseDetail';
import LogExplorer from './views/LogExplorer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes inside shared Layout */}
        <Route element={<Layout />}>

          {/* Both roles */}
          <Route path="/overview" element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ANALYST']}>
              <Overview />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ANALYST']}>
              <UserProfile />
            </ProtectedRoute>
          } />

          {/* Manager only */}
          <Route path="/hosts" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Hosts />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/rules" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Rules />
            </ProtectedRoute>
          } />
          <Route path="/audit" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Audit />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Reports />
            </ProtectedRoute>
          } />

          {/* Analyst only */}
          <Route path="/alerts" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <Alerts />
            </ProtectedRoute>
          } />
          <Route path="/alerts/:id" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <AlertDetail />
            </ProtectedRoute>
          } />
          <Route path="/cases" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <Cases />
            </ProtectedRoute>
          } />
          <Route path="/cases/:id" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <CaseDetail />
            </ProtectedRoute>
          } />
          <Route path="/explorer" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <LogExplorer />
            </ProtectedRoute>
          } />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
