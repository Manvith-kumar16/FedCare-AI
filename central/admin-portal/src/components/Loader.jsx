import { Player } from '@lottiefiles/react-lottie-player';

export default function Loader({ message = "Loading...", fullScreen = false }) {
    const containerStyle = fullScreen 
        ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--color-bg-primary)' }
        : { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', width: '100%' };

    return (
        <div style={containerStyle} className="fade-in">
            <Player
                autoplay
                loop
                src="https://lottie.host/195b0ff7-93cf-4ed3-b68f-9a7ed7efbb75/6gB58U8iZt.json" // A clean abstract loader
                style={{ height: '120px', width: '120px' }}
            />
            {message && <div style={{ marginTop: '16px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>{message}</div>}
        </div>
    );
}
