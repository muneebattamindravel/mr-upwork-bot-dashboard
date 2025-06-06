import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  BarChart,
  Briefcase,
  Settings,
  Monitor,
  Sliders,
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
        to="/relevanceSettings"
        className={({ isActive }) =>
          `${navItemClass} ${isActive ? activeClass : 'hover:bg-white hover:bg-opacity-10'}`
        }
        onClick={() => setIsOpen(false)}
      >
        <Sliders className="w-5 h-5" />
        Relevance Settings
      </NavLink>

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
        to="/bots"
        className={({ isActive }) =>
          `${navItemClass} ${isActive ? activeClass : 'hover:bg-white hover:bg-opacity-10'}`
        }
        onClick={() => setIsOpen(false)}
      >
        <Monitor className="w-5 h-5" />
        Bot Monitor
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
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="text-purple-800 hover:text-purple-600 bg-white p-2 rounded-md shadow"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-purple-700 to-purple-900 text-white p-4 z-40">
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
