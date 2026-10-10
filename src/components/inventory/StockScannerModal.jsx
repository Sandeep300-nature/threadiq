import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Camera, Barcode, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, X } from 'lucide-react';

export const StockScannerModal = ({ isOpen, onClose, inventory = [], onUpdateStock }) => {
  const [step, setStep] = useState('scan'); // 'scan' | 'verify' | 'quantity' | 'complete'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [matchedItem, setMatchedItem] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState(1);
  const [operationType, setOperationType] = useState('recount'); // 'recount' | 'inbound' | 'outbound'
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize or stop camera stream when modal opens/closes or on scan step
  useEffect(() => {
    if (isOpen && step === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, step]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser environment. Use manual barcode input.');
      setCameraActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError('Camera access denied or unavailable on this device. Manual barcode entry enabled below.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleBarcodeSubmit = (codeToTest) => {
    const query = (codeToTest || barcodeInput).trim().toUpperCase();
    if (!query) return;

    // Search inventory for matching SKU code or ID
    const found = inventory.find(
      i => i.skuCode.toUpperCase() === query || i.id.toUpperCase() === query
    );

    if (found) {
      setMatchedItem(found);
      setAdjustmentQty(found.availableQty);
      stopCamera();
      setStep('verify');
    } else {
      setCameraError(`SKU "${query}" not recognized in active catalogue.`);
    }
  };

  const handleConfirmQuantity = () => {
    setStep('quantity');
  };

  const handleApplyUpdate = () => {
    if (matchedItem && onUpdateStock) {
      let newQty = adjustmentQty;
      if (operationType === 'inbound') {
        newQty = matchedItem.availableQty + adjustmentQty;
      } else if (operationType === 'outbound') {
        newQty = Math.max(0, matchedItem.availableQty - adjustmentQty);
      }
      onUpdateStock(matchedItem.id, newQty, operationType);
      setStep('complete');
    }
  };

  const handleReset = () => {
    setStep('scan');
    setBarcodeInput('');
    setMatchedItem(null);
    setAdjustmentQty(1);
    setCameraError(null);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Store Barcode & Camera Scanner"
      subtitle="Distinct 4-step physical stock verification protocol"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span className="technical-index">
            STEP: {step.toUpperCase()} // PROTOCOL V2
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step !== 'scan' && (
              <button onClick={handleReset} className="btn btn-secondary btn-sm">
                <RotateCcw size={13} />
                <span>Scan Another</span>
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary btn-sm">
              Close
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Step Indicator */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
            backgroundColor: 'var(--bg-canvas)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)'
          }}
        >
          {['1. Capture', '2. Identify', '3. Quantity', '4. Complete'].map((label, i) => {
            const stepKeys = ['scan', 'verify', 'quantity', 'complete'];
            const isActive = stepKeys[i] === step;
            return (
              <div
                key={label}
                style={{
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-tech)',
                  padding: '4px',
                  borderRadius: '2px',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#000000' : 'var(--text-dim)',
                  fontWeight: isActive ? 700 : 500
                }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* STEP 1: CAMERA ACCESS & BARCODE ENTRY */}
        {step === 'scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Live Camera Viewport / Fallback */}
            <div
              style={{
                height: '200px',
                backgroundColor: '#0a0a0e',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: cameraActive ? 'block' : 'none'
                }}
                playsInline
                muted
              />

              {!cameraActive && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', padding: '20px', textAlign: 'center' }}>
                  <Camera size={32} />
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)' }}>
                    {cameraError || 'Initializing video sensor...'}
                  </span>
                </div>
              )}

              {/* Targeting Reticle Overlay */}
              {cameraActive && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '24px',
                    border: '1px dashed rgba(255, 255, 255, 0.4)',
                    borderRadius: 'var(--radius-xs)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-tech)', color: 'var(--text-white)', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2px 6px' }}>
                    ALIGN BARCODE WITHIN FRAME
                  </span>
                </div>
              )}
            </div>

            {/* Manual Barcode Input */}
            <div>
              <label htmlFor="manual-barcode" style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', color: 'var(--text-silver)', marginBottom: '4px' }}>
                MANUAL BARCODE / SKU INPUT:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="manual-barcode"
                  type="text"
                  placeholder="e.g. VWT-4XL-BLK-01"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
                  className="search-input"
                  style={{ textTransform: 'uppercase' }}
                />
                <button onClick={() => handleBarcodeSubmit()} className="btn btn-primary btn-sm">
                  <Barcode size={14} />
                  <span>Lookup</span>
                </button>
              </div>
            </div>

            {/* Quick Test Barcode Simulators */}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-hairline)', paddingTop: '10px' }}>
              <span>Quick Test Barcodes: </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {['VWT-4XL-BLK-01', 'OSC-XXL-NVY-03', 'DSB-5XL-SND-01'].map(code => (
                  <button
                    key={code}
                    onClick={() => handleBarcodeSubmit(code)}
                    style={{
                      fontFamily: 'var(--font-tech)',
                      fontSize: '0.68rem',
                      padding: '2px 6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-hairline)',
                      color: 'var(--text-silver)',
                      borderRadius: 'var(--radius-btn-sm)'
                    }}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PRODUCT IDENTIFICATION & VERIFICATION */}
        {step === 'verify' && matchedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="technical-index">SKU: {matchedItem.skuCode}</span>
                <span className="badge badge-pending">VERIFIED</span>
              </div>

              <div className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-white)', marginTop: '4px' }}>
                {matchedItem.name}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Size</span>
                  <div className="font-tech" style={{ fontWeight: 700 }}>{matchedItem.size}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Colour</span>
                  <div>{matchedItem.colour}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Location</span>
                  <div>{matchedItem.storeName}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                System recorded count: <strong style={{ color: 'var(--text-white)' }}>{matchedItem.availableQty} units</strong>
              </span>
              <button onClick={handleConfirmQuantity} className="btn btn-primary btn-sm">
                <span>Proceed to Quantity Count</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: QUANTITY COUNT & ADJUSTMENT TYPE */}
        {step === 'quantity' && matchedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', color: 'var(--text-silver)', marginBottom: '6px' }}>
                OPERATION TYPE:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { key: 'recount', label: 'Physical Audit (Set)' },
                  { key: 'inbound', label: 'Receive Inbound (+)' },
                  { key: 'outbound', label: 'Damage Write-off (-)' }
                ].map(op => (
                  <button
                    key={op.key}
                    type="button"
                    onClick={() => setOperationType(op.key)}
                    style={{
                      padding: '8px',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-tech)',
                      backgroundColor: operationType === op.key ? '#ffffff' : 'rgba(255,255,255,0.03)',
                      color: operationType === op.key ? '#000000' : 'var(--text-secondary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-btn-sm)',
                      fontWeight: 600
                    }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="adjust-qty" style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', color: 'var(--text-silver)', marginBottom: '6px' }}>
                {operationType === 'recount' ? 'CONFIRMED ON-HAND COUNT:' : 'QUANTITY TO ADJUST:'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="adjust-qty"
                  type="number"
                  min="0"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="search-input font-tech"
                  style={{ fontSize: '1.1rem', fontWeight: 700, width: '120px' }}
                />
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 5, 10].map(delta => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => setAdjustmentQty(prev => prev + delta)}
                      className="btn btn-secondary btn-sm font-tech"
                    >
                      +{delta}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-hairline)' }}>
              <button onClick={handleApplyUpdate} className="btn btn-success" style={{ width: '100%' }}>
                <CheckCircle2 size={14} />
                <span>Commit Simulated Inventory Update</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: UPDATE CONFIRMATION */}
        {step === 'complete' && matchedItem && (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-balanced)'
              }}
            >
              <CheckCircle2 size={24} />
            </div>

            <h4 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-white)' }}>
              Stock Count Updated (Simulation)
            </h4>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-silver)', maxWidth: '360px' }}>
              Simulated inventory update for <strong>{matchedItem.name} ({matchedItem.size})</strong> has been saved to frontend state.
            </p>

            <button onClick={handleReset} className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
              <span>Scan Next Barcode</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
