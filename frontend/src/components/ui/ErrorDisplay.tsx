import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, ShieldAlert } from 'lucide-react';

type ErrorType = 'network' | 'server' | 'unauthorized' | 'not_found' | 'generic';

interface ErrorDisplayProps {
  type?: ErrorType;
  message?: string;
  onRetry?: () => void;
}

const errorConfig = {
  network: {
    icon: <WifiOff size={48} className="mb-4 text-warning" />,
    title: 'Network Unavailable',
    description: 'Cannot reach the federated server. Your node may be offline.',
    color: 'warning',
  },
  server: {
    icon: <ServerCrash size={48} className="mb-4 text-danger" />,
    title: 'Server Error',
    description: 'The aggregation node returned an unexpected error. Try again shortly.',
    color: 'danger',
  },
  unauthorized: {
    icon: <ShieldAlert size={48} className="mb-4 text-primary" />,
    title: 'Access Denied',
    description: 'You do not have permission to access this medical resource.',
    color: 'primary',
  },
  not_found: {
    icon: <AlertTriangle size={48} className="mb-4 text-info" />,
    title: 'Resource Not Found',
    description: 'The requested model, dataset, or server no longer exists.',
    color: 'info',
  },
  generic: {
    icon: <AlertTriangle size={48} className="mb-4 text-muted" />,
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    color: 'secondary',
  },
};

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  type = 'generic',
  message,
  onRetry,
}) => {
  const cfg = errorConfig[type];

  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 px-4 animate-fade-in">
      {cfg.icon}
      <h5 className="fw-bold mb-2">{cfg.title}</h5>
      <p className="text-muted small mb-4 col-md-6">{message || cfg.description}</p>

      {onRetry && (
        <button
          className={`btn btn-outline-${cfg.color} px-4 py-2 rounded-pill fw-bold d-flex align-items-center gap-2`}
          onClick={onRetry}
        >
          <RefreshCw size={16} />
          Retry Connection
        </button>
      )}
    </div>
  );
};

export default ErrorDisplay;
