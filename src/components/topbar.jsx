import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const ROLE_LABEL = {
  superAdmin: { text: 'Super Admin', cls: 'bg-purple-100 text-purple-700' },
  admin:      { text: 'Admin',       cls: 'bg-blue-100 text-blue-700' },
  employee:   { text: 'Employee',    cls: 'bg-gray-100 text-gray-600' },
};

const Topbar = ({ setSidebarOpen }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  let user = null;
  try {
    const raw = localStorage.getItem('user');
    user = raw && raw !== 'undefined' ? JSON.parse(raw) : null;
  } catch { user = null; }

  const displayName = user?.name || user?.username || 'User';
  const roleInfo    = ROLE_LABEL[user?.role] || null;

  const handleLogout = () => {
    ['accessToken', 'refreshToken', 'userId', 'user', 'token'].forEach(k => localStorage.removeItem(k));
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-white shadow-md border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 relative">
        {/* Mobile Sidebar Toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-purple-800 hover:text-purple-600 bg-white p-2 rounded-md shadow"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Branding */}
        <div className="flex items-center gap-3 mx-auto md:ml-0 md:mr-auto">
          <div className="flex flex-col leading-tight text-center md:text-left">
            <span className="font-semibold text-base sm:text-lg text-purple-800">Mindravel Interactive</span>
            <span className="text-xs text-gray-500 sm:text-sm -mt-1">Upwork Bot Dashboard</span>
          </div>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium px-3 py-1.5 rounded-full"
          >
            <User className="w-5 h-5" />
            <span className="hidden sm:inline">{displayName}</span>
            {roleInfo && (
              <span className={`hidden md:inline text-xs px-1.5 py-0.5 rounded-full font-medium ${roleInfo.cls}`}>
                {roleInfo.text}
              </span>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50 overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="font-medium text-sm text-gray-800">{displayName}</div>
                {user?.username && user.username !== displayName && (
                  <div className="text-xs text-gray-500">@{user.username}</div>
                )}
                {roleInfo && (
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${roleInfo.cls}`}>
                    {roleInfo.text}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
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
