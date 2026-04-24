import React, { useState } from 'react';

const JoinModal = ({ isOpen, onClose, onConfirm, initialName, loading }) => {
    const [name, setName] = useState(initialName || '');

    React.useEffect(() => {
        if (isOpen) {
            setName(initialName || '');
        }
    }, [isOpen, initialName]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={(e) => e.stopPropagation()} style={{
                maxWidth: '450px',
                width: '90%',
                padding: '32px',
                animation: 'fadeInUp 0.3s ease-out'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '3rem', marginBottom: '16px', display: 'block' }}>🏥</span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-bright)', marginBottom: '8px' }}>
                        Join Disease Server
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        Please provide your professional Hospital Name to participate in this federated learning session.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="hospital-name">Professional Hospital Name</label>
                        <input
                            id="hospital-name"
                            type="text"
                            className="form-input"
                            placeholder="e.g., Metropolitan Health Center"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--color-border)',
                                padding: '12px 16px',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 2 }}
                            disabled={loading || !name.trim()}
                        >
                            {loading ? 'Joining...' : 'Confirm & Join'}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 7, 18, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .modal-content {
          border: 1px solid rgba(102, 126, 234, 0.3);
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5), var(--shadow-glow);
        }
      `}</style>
        </div>
    );
};

export default JoinModal;
