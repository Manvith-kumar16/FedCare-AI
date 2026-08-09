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
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        User Profile
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        Manage your identity, authentication, and view your cryptographic credentials.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
                
                {/* Left Column: Identity & Logout */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: 'fit-content' }}>
                    <div style={{
                        width: '100px', height: '100px',
                        borderRadius: '50%',
                        background: 'rgba(91, 101, 220, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '3rem', fontWeight: 800, color: 'var(--color-accent-blue)',
                        marginBottom: '20px',
                        textTransform: 'uppercase'
                    }}>
                        {initials}
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px', color: 'var(--color-text-primary)' }}>
                        {userName || 'FedCare User'}
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <HiOutlineMail size={16} /> {userEmail}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', background: 'rgba(0, 230, 118, 0.1)', color: 'var(--color-accent-green)', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '32px' }}>
                        <HiOutlineShieldCheck size={16} /> Active Session
                    </div>

                    <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }}>
                        <HiOutlineLogout size={18} /> Secure Log Out
                    </button>
                </div>

                {/* Right Column: Network Details & Security */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card">
                        <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <HiOutlineDesktopComputer style={{ color: 'var(--color-accent-blue)' }} size={22} /> Network Identity
                            </h3>
                        </div>
                        
                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    <HiOutlineShieldCheck style={{ color: 'var(--color-accent-blue)' }} size={18} /> {userRole}
                                </div>
                            </div>
                            
                            {hospitalName && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Affiliation</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                        <HiOutlineOfficeBuilding style={{ color: 'var(--color-accent-blue)' }} size={18} /> {hospitalName}
                                    </div>
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Node ID</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', color: 'var(--color-accent-blue)', fontSize: '1rem', background: 'var(--color-bg-secondary)', padding: '6px 12px', borderRadius: '6px' }}>
                                    0x9A3B...{userEmail ? userEmail.slice(0, 4).toUpperCase() : '421F'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ background: '#F0FDF4', border: '1px solid #DCFCE7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <HiOutlineKey size={24} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, color: '#166534', fontSize: '1.1rem' }}>Encryption Keys</div>
                                <div style={{ fontSize: '0.85rem', color: '#15803D', fontWeight: 500 }}>Synchronized & Secure</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#166534', lineHeight: 1.6, opacity: 0.9 }}>
                            Your local node strictly utilizes Homomorphic Encryption to preserve data privacy. Keys rotate automatically every 24 hours. The Central Coordinator cannot decrypt your datasets.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
