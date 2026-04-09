import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', footer }) => {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="card-header bg-transparent border-0 pt-4 px-4 pb-0">
          <h5 className="fw-bold m-0">{title}</h5>
        </div>
      )}
      <div className="card-body p-4">
        {children}
      </div>
      {footer && (
        <div className="card-footer bg-transparent border-top-0 pb-4 px-4 pt-0">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
