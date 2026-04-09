import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Bell, Search, LogOut, User as UserIcon, Menu, Sun, Moon } from 'lucide-react';
import { Dropdown, InputGroup, Form } from 'react-bootstrap';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="glass-effect border-bottom border-light px-4 py-3 d-flex align-items-center justify-content-between sticky-top z-1000" style={{ height: 'var(--header-height)' }}>
      <div className="d-flex align-items-center gap-3">
        <button className="btn btn-link link-dark d-lg-none p-0" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        
        <InputGroup className="d-none d-md-flex" style={{ width: '300px' }}>
          <InputGroup.Text className="bg-light border-0">
            <Search size={18} className="text-muted" />
          </InputGroup.Text>
          <Form.Control 
            placeholder="Search resources..." 
            className="bg-light border-0 small"
          />
        </InputGroup>
      </div>

      <div className="d-flex align-items-center gap-3">
        <button 
          className="btn btn-link link-dark p-2" 
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button className="btn btn-link link-dark p-2 position-relative">
          <Bell size={20} />
          <span className="position-absolute top-2 end-2 p-1 bg-danger border border-light rounded-circle">
            <span className="visually-hidden">New notifications</span>
          </span>
        </button>

        <div className="vr mx-2 bg-secondary opacity-25" style={{ height: '24px' }}></div>

        <Dropdown align="end">
          <Dropdown.Toggle variant="link" className="p-0 border-0 d-flex align-items-center link-dark text-decoration-none shadow-none">
            <div className="me-2 text-end d-none d-sm-block">
              <div className="small fw-bold">{user?.name}</div>
              <div className="extra-small text-muted text-uppercase">{user?.role}</div>
            </div>
            <div className="p-2 bg-primary bg-opacity-10 rounded-circle">
              <UserIcon size={20} className="text-primary" />
            </div>
          </Dropdown.Toggle>

          <Dropdown.Menu className="shadow-lg border-0 rounded-3 mt-2">
            <Dropdown.Header className="extra-small text-muted uppercase-spacing fw-bold">User Account</Dropdown.Header>
            <Dropdown.Item href="#/profile" className="py-2 small">
               Profile Settings
            </Dropdown.Item>
            <Dropdown.Item href="#/activity" className="py-2 small">
               Activity Log
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={logout} className="py-2 small text-danger fw-bold">
              <LogOut size={16} className="me-2" />
              Sign Out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
};

export default Navbar;
