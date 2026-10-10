import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Save } from 'lucide-react';

export const AccountForm = () => {
  const { addToast } = useApp();
  const [profile, setProfile] = useState({
    fullName: 'Alex Chen',
    email: 'alex.chen@threadiq-retail.internal',
    role: 'Principal Retail Inventory Planner',
    department: 'Apparel Merchandising & Supply Chain',
    assignedRegion: 'North America Network (Flagships)',
    language: 'English (US)'
  });

  const handleChange = (field, val) => {
    setProfile(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addToast('Account profile preferences saved', 'success');
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '780px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#262732',
            border: '1px solid var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text-white)'
          }}
        >
          AC
        </div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {profile.fullName}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {profile.role} • {profile.department}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
        {/* Full Name */}
        <div>
          <label htmlFor="account-fullname" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Full Name
          </label>
          <input
            id="account-fullname"
            type="text"
            value={profile.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className="search-input"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="account-email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Work Email
          </label>
          <input
            id="account-email"
            type="email"
            value={profile.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="search-input"
          />
        </div>

        {/* Role */}
        <div>
          <label htmlFor="account-role" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Organizational Role
          </label>
          <input
            id="account-role"
            type="text"
            value={profile.role}
            onChange={(e) => handleChange('role', e.target.value)}
            className="search-input"
          />
        </div>

        {/* Department */}
        <div>
          <label htmlFor="account-dept" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Department
          </label>
          <input
            id="account-dept"
            type="text"
            value={profile.department}
            onChange={(e) => handleChange('department', e.target.value)}
            className="search-input"
          />
        </div>

        {/* Assigned Region */}
        <div>
          <label htmlFor="account-region" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Assigned Store Scope
          </label>
          <input
            id="account-region"
            type="text"
            value={profile.assignedRegion}
            onChange={(e) => handleChange('assignedRegion', e.target.value)}
            className="search-input"
          />
        </div>

        {/* Interface Language */}
        <div>
          <label htmlFor="account-lang" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Interface Language
          </label>
          <select
            id="account-lang"
            value={profile.language}
            onChange={(e) => handleChange('language', e.target.value)}
            className="search-input"
          >
            <option value="English (US)">English (US)</option>
            <option value="English (UK)">English (UK)</option>
            <option value="French (FR)">Français</option>
            <option value="Spanish (ES)">Español</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          * Illustrative planner profile for demonstration.
        </span>

        <button type="submit" className="btn btn-primary">
          <Save size={15} />
          <span>Save Account Profile</span>
        </button>
      </div>
    </form>
  );
};
