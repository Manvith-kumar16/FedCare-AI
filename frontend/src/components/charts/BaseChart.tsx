import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface BaseChartProps {
  children: React.ReactElement;
  height?: number | string;
  title?: string;
  className?: string;
}

const BaseChart: React.FC<BaseChartProps> = ({ 
  children, 
  height = 300, 
  title, 
  className = '' 
}) => {
  return (
    <div className={`chart-container ${className}`}>
      {title && <h6 className="fw-bold mb-4 uppercase-spacing extra-small text-muted">{title}</h6>}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BaseChart;
