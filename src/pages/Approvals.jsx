import React, { useState } from 'react';
import { RecommendationCard } from '../components/approvals/RecommendationCard';
import { ApprovalDialog } from '../components/approvals/ApprovalDialog';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { CheckCircle2 } from 'lucide-react';

export const Approvals = () => {
  const {
    recommendations,
    handleApproveRecommendation,
    handleRejectRecommendation
  } = useApp();

  const [activeTab, setActiveTab] = useState('all'); // all | pending | approved | rejected
  const [selectedRec, setSelectedRec] = useState(null);
  const [decisionType, setDecisionType] = useState('approve'); // 'approve' | 'reject'
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pendingCount = recommendations.filter(r => r.status === 'pending').length;
  const approvedCount = recommendations.filter(r => r.status === 'approved').length;
  const rejectedCount = recommendations.filter(r => r.status === 'rejected').length;

  const filteredRecs = recommendations.filter(r => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const handleInitiateApprove = (rec) => {
    setSelectedRec(rec);
    setDecisionType('approve');
    setIsDialogOpen(true);
  };

  const handleInitiateReject = (rec) => {
    setSelectedRec(rec);
    setDecisionType('reject');
    setIsDialogOpen(true);
  };

  const handleConfirmDecision = async (id, notes) => {
    if (decisionType === 'approve') {
      await handleApproveRecommendation(id, notes);
    } else {
      await handleRejectRecommendation(id, notes);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="technical-index">[ WORKFLOW // AUTHORIZATIONS ]</span>
            <span className="demo-tag">Prototype Action</span>
          </div>
          <h1 className="page-title">
            Rebalance Authorizations
          </h1>
          <p className="page-subtitle">
            Manager review queue for inter-store transfers, supplier replenishment, and promotional markdowns.
          </p>
        </div>

        <div className="header-actions">
          <span className="font-tech" style={{ fontSize: '0.8rem', color: 'var(--text-silver)' }}>
            <strong>{pendingCount}</strong> PROPOSALS AWAITING SIGN-OFF
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-hairline)',
          paddingBottom: '12px'
        }}
      >
        <button
          onClick={() => setActiveTab('all')}
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <span>All ({recommendations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <span>Pending Review ({pendingCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`btn btn-sm ${activeTab === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <span>Approved ({approvedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`btn btn-sm ${activeTab === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <span>Rejected ({rejectedCount})</span>
        </button>
      </div>

      {/* Recommendations Cards List */}
      {filteredRecs.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={`No ${activeTab} recommendations found`}
          description={
            activeTab === 'pending'
              ? 'All inventory balance suggestions have been processed.'
              : 'There are no proposals currently filed in this tab.'
          }
          actionLabel="View All Proposals"
          onAction={() => setActiveTab('all')}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '16px' }}>
          {filteredRecs.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onInitiateApprove={handleInitiateApprove}
              onInitiateReject={handleInitiateReject}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ApprovalDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        recommendation={selectedRec}
        decisionType={decisionType}
        onConfirm={handleConfirmDecision}
      />
    </div>
  );
};
