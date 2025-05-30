// src/components/Layout.jsx
import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ children }) => {
  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Content area with Topbar */}
      <div className="flex flex-col w-full min-h-screen md:ml-64">
        <Topbar />
        <main className="p-4 flex-grow">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
