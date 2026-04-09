import React from 'react';
import { Spinner } from 'react-bootstrap';

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-5" style={{ minHeight: '200px' }}>
      <Spinner animation="border" variant="primary" role="status" className="mb-2">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      <p className="text-muted">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
