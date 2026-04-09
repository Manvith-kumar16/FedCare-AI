import React from 'react';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  colorClass?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  icon, 
  trend, 
  colorClass = 'primary',
  className = '' 
}) => {
  return (
    <Card className={`h-100 ${className}`}>
      <div className="d-flex align-items-center">
        <div className={`p-3 bg-${colorClass} bg-opacity-10 rounded-3 me-3 text-${colorClass}`}>
          {icon}
        </div>
        <div>
          <small className="text-muted d-block uppercase-spacing extra-small fw-bold">
            {label}
          </small>
          <div className="d-flex align-items-baseline gap-2">
            <span className="h4 fw-bold mb-0">{value}</span>
            {trend && (
              <span className={`extra-small fw-bold ${trend.isUp ? 'text-success' : 'text-danger'}`}>
                {trend.isUp ? '+' : '-'}{trend.value}%
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
