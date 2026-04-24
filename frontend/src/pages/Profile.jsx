import { useNavigate } from 'react-router-dom'
import { HiOutlineUser, HiOutlineShieldCheck, HiOutlineKey, HiOutlineDesktopComputer, HiOutlineLogout, HiOutlineOfficeBuilding, HiOutlineMail } from 'react-icons/hi'
import { useApp } from '../contexts/AppContext'

export default function Profile() {
    const navigate = useNavigate()
    const { addToast, logout, userName, userEmail, userRole, hospitalName } = useApp()

    const handleLogout = () => {
        logout()
        addToast('Successfully safely logged out of FedCare. Encrypted session closed.', 'success')
        navigate('/login')
    }

    const initials = userName ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <HiOutlineUser style={{ opacity: 0.7 }} /> User Profile
                    </h1>
                    <p>Manage your identity and authentication</p>
                </div>
            </div>

            <div className="content-grid">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{
                        width: '100px', height: '100px',
                        borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '3rem', fontWeight: 800, color: 'white',
                        marginBottom: '20px',
                        boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)',
                        textTransform: 'uppercase'
                    }}>
                        {initials}
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px', color: 'var(--color-text-bright)' }}>
                        {userName || 'FedCare User'}
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <HiOutlineMail size={14} /> {userEmail}
                    </p>

                    <div className="badge badge-active" style={{ marginBottom: '32px', fontSize: '0.85rem', padding: '6px 16px' }}>
                        <HiOutlineShieldCheck /> Active Session
                    </div>

                    <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <HiOutlineLogout size={18} /> Secure Log Out
                    </button>
                </div>

                <div>
                    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                        <div className="section-header">
                            <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <HiOutlineDesktopComputer style={{ opacity: 0.7 }} /> Network Identity
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Role</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                                    <HiOutlineShieldCheck className="text-accent-blue" /> {userRole}
                                </div>
                            </div>
                            {hospitalName && (
                                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Affiliation</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                                        <HiOutlineOfficeBuilding className="text-accent-blue" /> {hospitalName}
                                    </div>
                                </div>
                            )}
                            <div style={{ paddingBottom: '4px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Node ID</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', color: 'var(--color-accent-blue)', fontSize: '0.9rem' }}>
                                    0x9A3B...{userEmail ? userEmail.slice(0, 4).toUpperCase() : '421F'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="metric-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div className="metric-icon green" style={{ width: '40px', height: '40px', fontSize: '1.2rem', marginBottom: 0 }}>
                                <HiOutlineKey />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>Encryption Keys</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-accent-green)' }}>Synchronized & Secure</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            Your local node strictly utilizes Homomorphic Encryption to preserve data privacy. Keys rotate automatically every 24 hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
