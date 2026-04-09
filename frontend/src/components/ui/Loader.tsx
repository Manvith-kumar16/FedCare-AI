import React from 'react';
import { Spinner } from 'react-bootstrap';

interface LoaderProps {
  fullPage?: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Loader: React.FC<LoaderProps> = ({ 
  fullPage = false, 
  message = 'Loading...', 
  size = 'md' 
}) => {
  const content = (
    <div className={`d-flex flex-column align-items-center justify-content-center p-4 ${fullPage ? 'vh-100' : ''}`}>
      <Spinner 
        animation="border" 
        variant="primary" 
        size={size === 'sm' ? 'sm' : undefined}
        style={size === 'md' ? { width: '2rem', height: '2rem' } : size === 'lg' ? { width: '4rem', height: '4rem' } : {}}
      />
      {message && (
        <p className="mt-3 text-muted small fw-medium uppercase-spacing animate-fade-in">
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="position-fixed top-0 start-0 w-100 h-100 bg-white bg-opacity-75 z-2000 d-flex align-items-center justify-content-center">
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;
