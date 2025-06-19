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
      const { token, user } = res.data.data;

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
    <div className="relative min-h-screen w-full bg-[url('/mindravel-banner.png')] bg-cover bg-center flex items-center justify-center">
      {/* 🔮 Blur overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[8px] z-0" />

      {/* 🔒 Login Card */}
      <form
        onSubmit={handleLogin}
        className="relative z-10 bg-white bg-opacity-90 p-6 rounded-lg shadow-xl w-full max-w-md"
      >
        <img
          src="/mindravel-logo-for-light.png"
          alt="Mindravel Logo"
          className="h-14 mx-auto mb-4"
        />
        <h2 className="text-xl font-semibold mb-4 text-center text-purple-800">
          Login to Dashboard
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            type="text"
            className="input-field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            className="input-field"
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
  );

};

export default Login;
