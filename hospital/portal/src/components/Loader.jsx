export default function Loader({ message = "Loading...", fullScreen = false }) {
    const containerStyle = fullScreen 
        ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--color-bg-primary)' }
        : { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', width: '100%' };

    return (
        <div style={containerStyle} className="fade-in">
            <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid rgba(0, 122, 255, 0.1)',
                borderLeftColor: 'var(--color-primary, #007aff)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }}></div>
            <style>
                {`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                `}
            </style>
            {message && <div style={{ marginTop: '20px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.5px' }}>{message}</div>}
        </div>
    );
}
