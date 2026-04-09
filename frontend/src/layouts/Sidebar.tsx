import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  X, 
  LayoutDashboard, 
  Server, 
  Database, 
  Activity, 
  Settings,
  Shield,
  Hospital as HospitalIcon,
  Target
} from 'lucide-react';

interface SidebarProps {
  active: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ active, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard', roles: ['ADMIN', 'HOSPITAL'] },
    { name: 'Disease Servers', icon: <Server size={20} />, path: '/servers', roles: ['ADMIN', 'HOSPITAL'] },
    { name: 'Datasets', icon: <Database size={20} />, path: '/datasets', roles: ['HOSPITAL'] },
    { name: 'Training Rounds', icon: <Activity size={20} />, path: '/training', roles: ['ADMIN', 'HOSPITAL'] },
    { name: 'Local Predictions', icon: <Target size={20} />, path: '/predictions', roles: ['HOSPITAL'] },
    { name: 'System Settings', icon: <Settings size={20} />, path: '/settings', roles: ['ADMIN', 'HOSPITAL'] },
  ];

  return (
    <nav className={`sidebar ${active ? 'active' : ''}`}>
      <div className="p-4 d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-25">
        <div className="d-flex align-items-center">
          <div className="p-2 bg-primary rounded-3 me-2">
            <Shield className="text-white" size={20} />
          </div>
          <h5 className="m-0 fw-bold text-white brand-font">FedCare AI</h5>
        </div>
        <button className="btn btn-link text-white d-md-none p-0" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
      
      <div className="mt-4 px-3 flex-grow-1">
        <p className="extra-small text-white-50 uppercase-spacing fw-bold px-3 mb-3">Main Menu</p>
        {navItems
          .filter(item => item.roles.includes(user?.role || ''))
          .map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) => 
                `d-flex align-items-center p-3 mb-2 rounded-3 text-decoration-none transition-all ${
                  isActive ? 'bg-primary text-white shadow-md' : 'text-white-50 hover-bg-white-10'
                }`
              }
              onClick={onClose}
            >
              <span className="me-3">{item.icon}</span>
              <span className="small fw-medium">{item.name}</span>
            </NavLink>
          ))}
      </div>

      <div className="p-3">
        <div className="d-flex align-items-center p-3 bg-white bg-opacity-5 rounded-3 border border-white border-opacity-10">
          <div className="p-2 bg-light bg-opacity-10 rounded-circle me-3">
            {user?.role === 'ADMIN' ? <Shield size={18} /> : <HospitalIcon size={18} />}
          </div>
          <div className="overflow-hidden">
            <div className="text-white small fw-bold text-truncate">{user?.name}</div>
            <div className="text-white-50 extra-small text-truncate text-uppercase">{user?.role}</div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
