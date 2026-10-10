import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const ApprovalDialog = ({
  isOpen,
  onClose,
  recommendation,
  decisionType, // 'approve' | 'reject'
  onConfirm
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !recommendation) return null;

  const isApprove = decisionType === 'approve';

  const handleConfirmAction = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(recommendation.id, notes);
      setNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isApprove ? 'Confirm Inventory Recommendation Approval' : 'Confirm Recommendation Rejection'}
      subtitle={`Action: ${recommendation.action.toUpperCase()} • ${recommendation.productName} (${recommendation.size})`}
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button
            onClick={handleConfirmAction}
            className={`btn ${isApprove ? 'btn-success' : 'btn-danger'}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Processing...'
            ) : isApprove ? (
              <>
                <CheckCircle2 size={16} />
                <span>Finalize Approval (Prototype)</span>
              </>
            ) : (
              <>
                <XCircle size={16} />
                <span>Confirm Rejection</span>
              </>
            )}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            padding: '14px',
            backgroundColor: isApprove ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            border: `1px solid ${isApprove ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}
        >
          <AlertTriangle
            size={18}
            style={{ color: isApprove ? 'var(--color-success)' : 'var(--color-danger)', flexShrink: 0, marginTop: '2px' }}
          />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {isApprove ? (
              <span>
                You are approving <strong>{recommendation.action}</strong> of{' '}
                <strong>{recommendation.proposedQty} units</strong> from{' '}
                <strong>{recommendation.sourceStore}</strong> to{' '}
                <strong>{recommendation.destStore || 'In-store merchandising'}</strong>.
              </span>
            ) : (
              <span>
                You are rejecting this AI recommendation. The system will dismiss the proposed{' '}
                <strong>{recommendation.action}</strong> and keep stock allocations intact.
              </span>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="decision-notes"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}
          >
            {isApprove ? 'Operational Notes (Optional for dispatch team):' : 'Rejection Reason / Feedback:'}
          </label>
          <textarea
            id="decision-notes"
            rows={3}
            placeholder={
              isApprove
                ? 'e.g. Approved for expedited batch dispatch via freight carrier #402.'
                : 'e.g. Local store manager confirmed stock count will be verified first.'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="search-input"
            style={{ height: 'auto', padding: '10px 12px', width: '100%', resize: 'vertical' }}
          />
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          * Notice: This is a frontend prototype action. No live courier dispatch or ERP order will be executed.
        </div>
      </div>
    </Modal>
  );
};
