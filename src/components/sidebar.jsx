// src/components/Sidebar.jsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  BarChart,
  Briefcase,
  Settings,
  Menu,
  X,
} from 'lucide-react';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItemClass =
    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors';

  const activeClass = 'bg-white bg-opacity-20 text-white font-semibold';

  const navLinks = (
    <nav className="space-y-2 mt-6">
      <NavLink
        to="/kb"
        className={({ isActive }) =>
          `${navItemClass} ${isActive ? activeClass : 'hover:bg-white hover:bg-opacity-10'}`
        }
        onClick={() => setIsOpen(false)}
      >
        <BookOpen className="w-5 h-5" />
        Knowledge Base
      </NavLink>
      <NavLink
        to="/analytics"
        className={({ isActive }) =>
          `${navItemClass} ${isActive ? activeClass : 'hover:bg-white hover:bg-opacity-10'}`
        }
        onClick={() => setIsOpen(false)}
      >
        <BarChart className="w-5 h-5" />
        Analytics
      </NavLink>
      <NavLink
        to="/jobs"
        className={({ isActive }) =>
          `${navItemClass} ${isActive ? activeClass : 'hover:bg-white hover:bg-opacity-10'}`
        }
        onClick={() => setIsOpen(false)}
      >
        <Briefcase className="w-5 h-5" />
        Jobs
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `${navItemClass} ${isActive ? activeClass : 'hover:bg-white hover:bg-opacity-10'}`
        }
        onClick={() => setIsOpen(false)}
      >
        <Settings className="w-5 h-5" />
        Settings
      </NavLink>
    </nav>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <div className="md:hidden p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="text-purple-800 hover:text-purple-600"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 h-screen bg-gradient-to-b from-purple-700 to-purple-900 text-white p-4">
        <h2 className="text-lg font-bold mb-6">Admin Panel</h2>
        {navLinks}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-0 left-0 w-64 h-full bg-gradient-to-b from-purple-700 to-purple-900 text-white p-4 z-50 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Admin Panel</h2>
              <button onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            {navLinks}
          </div>
        </>
      )}
    </>
  );
};

export default Sidebar;
