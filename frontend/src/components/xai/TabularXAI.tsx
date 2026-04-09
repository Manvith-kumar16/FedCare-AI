import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ReferenceLine
} from 'recharts';
import Card from '../ui/Card';

interface FeatureImportance {
  feature: string;
  value: number;
}

interface ProbabilityData {
  diagnosis: string;
  probability: number;
}

interface TabularXAIProps {
  shapData: FeatureImportance[];
  probabilityData: ProbabilityData[];
}

const TabularXAI: React.FC<TabularXAIProps> = ({ shapData, probabilityData }) => {
  return (
    <div className="tabular-xai animate-fade-in d-flex flex-column gap-4">
      {/* SHAP Feature Importance Chart */}
      <Card title="SHAP Importance (Local Node Contributors)">
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={shapData}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="feature" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                width={100}
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <ReferenceLine x={0} stroke="#cbd5e1" />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {shapData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.value > 0 ? '#ef476f' : '#06d6a0'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="extra-small text-muted mt-3 text-center mb-0">
          <span className="text-danger fw-bold me-2">Red:</span> Risk Contributor | 
          <span className="text-success fw-bold ms-2">Green:</span> Corrective/Neutral
        </p>
      </Card>

      {/* Probability Distribution */}
      <Card title="Diagnostic Probability Distribution">
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={probabilityData}>
              <XAxis 
                dataKey="diagnosis" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Bar 
                dataKey="probability" 
                fill="#4361ee" 
                radius={[4, 4, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default TabularXAI;
