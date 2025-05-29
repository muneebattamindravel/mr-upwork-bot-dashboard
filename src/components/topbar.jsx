import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
  const navigate = useNavigate();

  // ✅ Safely parse user from localStorage
  let user = null;
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser && storedUser !== 'undefined') {
      user = JSON.parse(storedUser);
    }
  } catch (err) {
    console.error('Invalid user JSON in localStorage:', err);
    localStorage.removeItem('user');
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="w-full px-4 py-3 border-b bg-white flex items-center justify-between">
      <h1 className="text-lg font-semibold">Admin Dashboard</h1>

      <div className="flex items-center gap-4 ml-auto">
        <div className="text-sm text-gray-600">
          Welcome, {user?.name || 'Admin'} 👋
        </div>
        <button onClick={handleLogout} className="btn-outline flex items-center gap-2 h-10 px-4">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Topbar;
