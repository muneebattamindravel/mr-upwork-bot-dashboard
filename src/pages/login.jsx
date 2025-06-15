import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../apis/axios';
import { toast } from 'sonner';
import LoadingButton from '@/components/ui/loading-button';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/jobs');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() && !password.trim()) {
      toast.error('Please enter both username and password');
      return;
    }
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (!password.trim()) {
      toast.error('Password is required');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/auth/login', { username, password });
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      toast.success('Logged in successfully');
      navigate('/jobs');
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.message || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
      style={{ backgroundImage: "url('/mindravel-banner.png')" }}
    >
      <div className="bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/mindravel-logo-for-light.png"
            alt="Mindravel Logo"
            className="h-14 mb-2"
          />
          <h1 className="text-xl font-semibold text-purple-800 text-center">
            Welcome to MR Upwork Bot
          </h1>
          <p className="text-sm text-gray-500 text-center">
            Please log in to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              className="input-field w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="input-field w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <LoadingButton
            type="submit"
            className="w-full"
            loading={loading}
          >
            Login
          </LoadingButton>
        </form>
      </div>
    </div>
  );
};

export default Login;
