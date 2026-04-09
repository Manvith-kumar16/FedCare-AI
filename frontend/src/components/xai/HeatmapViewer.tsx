import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import { Layers, Image as ImageIcon, Search, Maximize2 } from 'lucide-react';
import Card from '../ui/Card';

interface HeatmapViewerProps {
  imageSrc: string;
  heatmapOpacity?: number;
}

const HeatmapViewer: React.FC<HeatmapViewerProps> = ({ 
  imageSrc, 
  heatmapOpacity: initialOpacity = 0.6 
}) => {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [opacity, setOpacity] = useState(initialOpacity);

  return (
    <div className="xai-viewer animate-fade-in">
      <Card className="border-0 shadow-sm overflow-hidden bg-dark">
        <div className="position-relative overflow-hidden rounded-3 bg-black" style={{ minHeight: '400px' }}>
          {/* Base Medical Image */}
          <img 
            src={imageSrc} 
            alt="Medical Scan" 
            className="img-fluid w-100 h-100 object-fit-cover"
            style={{ filter: 'grayscale(0.5) contrast(1.2)' }}
          />
          
          {/* Simulated Grad-CAM Heatmap Overlay */}
          <div 
            className="position-absolute top-0 start-0 w-100 h-100 transition-all pointer-events-none"
            style={{ 
              opacity: showHeatmap ? opacity : 0,
              background: 'radial-gradient(circle at 40% 35%, rgba(239, 71, 111, 0.8) 0%, rgba(255, 183, 3, 0.4) 30%, transparent 60%), radial-gradient(circle at 65% 55%, rgba(239, 71, 111, 0.6) 0%, rgba(255, 183, 3, 0.3) 25%, transparent 50%)',
              mixBlendMode: 'overlay',
              filter: 'blur(15px)'
            }}
          />

          {/* Viewer Controls (Overlay) */}
          <div className="position-absolute bottom-0 start-0 w-100 p-3 glass-effect d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <button 
                className={`btn btn-sm rounded-pill px-3 fw-bold d-flex align-items-center transition-all ${showHeatmap ? 'btn-primary' : 'btn-light text-muted'}`}
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                <Layers size={14} className="me-2" />
                {showHeatmap ? 'Heatmap On' : 'Heatmap Off'}
              </button>
              
              {showHeatmap && (
                <div className="d-flex align-items-center gap-2 ms-2">
                  <span className="extra-small text-white fw-bold uppercase-spacing opacity-75">Opacity</span>
                  <input 
                    type="range" 
                    className="form-range" 
                    style={{ width: '80px', height: '4px' }}
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value={opacity} 
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  />
                </div>
              )}
            </div>
            
            <div className="d-flex gap-2">
              <button className="btn btn-dark btn-sm rounded-circle p-2 opacity-75 hover-opacity-100">
                <Search size={16} className="text-white" />
              </button>
              <button className="btn btn-dark btn-sm rounded-circle p-2 opacity-75 hover-opacity-100">
                <Maximize2 size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="mt-3 alert alert-info border-0 glass-effect p-3 d-flex align-items-start shadow-sm">
        <Layers size={20} className="text-info me-3 mt-1" />
        <div>
          <h6 className="fw-bold mb-1 extra-small uppercase-spacing text-info">Grad-CAM Interpretation</h6>
          <p className="extra-small text-muted mb-0">
            Red regions indicate areas that most contributed to the <strong>{showHeatmap ? 'Positive' : 'Selected'}</strong> classification. 
            The focus is currently on the <strong>superior lobe</strong> of the left lung.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeatmapViewer;
