// src/components/Topbar.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const Topbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-white shadow-md border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <h1 className="text-lg font-semibold text-purple-800">Admin Dashboard</h1>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium px-3 py-1.5 rounded-full"
          >
            <User className="w-5 h-5" />
            <span className="hidden sm:inline">Admin</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-50">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
