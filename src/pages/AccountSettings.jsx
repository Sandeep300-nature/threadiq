import React from 'react';
import { AccountForm } from '../components/settings/AccountForm';

export const AccountSettings = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Account Profile</span>
            <span className="demo-tag">Sample Profile</span>
          </h1>
          <p className="page-subtitle">
            Merchandise planner details, store scope assignments, and operational permissions.
          </p>
        </div>
      </div>

      <AccountForm />
    </div>
  );
};
