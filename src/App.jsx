import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { Overview } from './pages/Overview';
import { Inventory } from './pages/Inventory';
import { StoreNetwork } from './pages/StoreNetwork';
import { Approvals } from './pages/Approvals';
import { AccountSettings } from './pages/AccountSettings';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary moduleName="ThreadIQ Platform Root">
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Standard Manager Routes */}
            <Route path="/manager" element={<AppLayout />}>
              <Route index element={<Navigate to="/manager/overview" replace />} />
              <Route path="overview" element={<ErrorBoundary moduleName="Network Diagnostic Overview"><Overview /></ErrorBoundary>} />
              <Route path="inventory" element={<ErrorBoundary moduleName="Authoritative Inventory"><Inventory /></ErrorBoundary>} />
              <Route path="stores" element={<ErrorBoundary moduleName="Store Network & Telemetry"><StoreNetwork /></ErrorBoundary>} />
              <Route path="transfers" element={<ErrorBoundary moduleName="Stock Transfers & Approvals"><Approvals /></ErrorBoundary>} />
              <Route path="approvals" element={<ErrorBoundary moduleName="Stock Transfers & Approvals"><Approvals /></ErrorBoundary>} />
              <Route path="settings" element={<Navigate to="/manager/settings/account" replace />} />
              <Route path="settings/account" element={<ErrorBoundary moduleName="Account Settings"><AccountSettings /></ErrorBoundary>} />
              <Route path="account" element={<ErrorBoundary moduleName="Account Settings"><AccountSettings /></ErrorBoundary>} />
              <Route path="*" element={<Navigate to="/manager/overview" replace />} />
            </Route>

            {/* Root and Alias Routes */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/manager/overview" replace />} />
              <Route path="overview" element={<ErrorBoundary moduleName="Network Diagnostic Overview"><Overview /></ErrorBoundary>} />
              <Route path="inventory" element={<ErrorBoundary moduleName="Authoritative Inventory"><Inventory /></ErrorBoundary>} />
              <Route path="stores" element={<ErrorBoundary moduleName="Store Network & Telemetry"><StoreNetwork /></ErrorBoundary>} />
              <Route path="transfers" element={<ErrorBoundary moduleName="Stock Transfers & Approvals"><Approvals /></ErrorBoundary>} />
              <Route path="approvals" element={<ErrorBoundary moduleName="Stock Transfers & Approvals"><Approvals /></ErrorBoundary>} />
              <Route path="settings" element={<Navigate to="/manager/settings/account" replace />} />
              <Route path="settings/account" element={<ErrorBoundary moduleName="Account Settings"><AccountSettings /></ErrorBoundary>} />
              <Route path="account" element={<ErrorBoundary moduleName="Account Settings"><AccountSettings /></ErrorBoundary>} />
              <Route path="*" element={<Navigate to="/manager/overview" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
