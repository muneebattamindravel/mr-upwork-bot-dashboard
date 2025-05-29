import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

export const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
};


export default Layout;
