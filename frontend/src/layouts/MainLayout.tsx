import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarActive, setSidebarActive] = useState(false);

  return (
    <div className="wrapper">
      {/* Enhanced Modular Sidebar */}
      <Sidebar 
        active={sidebarActive} 
        onClose={() => setSidebarActive(false)} 
      />

      {/* Main Content Area */}
      <div className="main-content d-flex flex-column p-0">
        {/* Enhanced Glass-Effect Navbar */}
        <Navbar 
          onMenuClick={() => setSidebarActive(true)} 
        />

        {/* Dynamic Page Content */}
        <main className="p-4 p-lg-5 animate-fade-in flex-grow-1">
          {children}
        </main>
        
        {/* Simple Footer */}
        <footer className="px-5 py-4 border-top border-light bg-white text-muted small d-flex justify-content-between">
          <div>&copy; 2026 FedCare AI. All rights reserved.</div>
          <div className="d-flex gap-4">
            <span className="cursor-pointer">Documentation</span>
            <span className="cursor-pointer">Support</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
