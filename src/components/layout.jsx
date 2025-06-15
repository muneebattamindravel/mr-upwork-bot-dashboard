// src/components/Layout.jsx
import React, { useState } from 'react';
import Sidebar from './sidebar';
import Topbar from './topbar';

const Layout = ({ children }) => {
  // 👇 Shared sidebar state
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex">
      {/* Sidebar with props */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Content area with Topbar */}
      <div className="flex flex-col w-full min-h-screen md:ml-64">
        <Topbar setSidebarOpen={setSidebarOpen} />
        <main className="p-4 flex-grow">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
