import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

// src/layouts/Layout.jsx (or wherever your main layout is)
export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[250px] bg-white border-r h-full fixed z-10">
        {/* Your Sidebar Content */}
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="ml-[250px] flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
