// src/pages/notFound.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[url('/mindravel-banner.png')] bg-cover bg-center flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[8px] z-0" />
      
      <div className="relative z-10 bg-white bg-opacity-90 shadow-lg rounded-lg p-8 w-full max-w-md text-center">
        <img
          src="/mindravel-logo-for-light.png"
          alt="Mindravel Logo"
          className="h-14 mb-4 mx-auto"
        />
        <h1 className="text-3xl font-bold text-purple-800 mb-2">404 - Page Not Found</h1>
        <p className="text-gray-600 mb-6">Sorry, the page you’re looking for doesn’t exist.</p>
        <button
          onClick={() => navigate('/jobs')}
          className="bg-purple-700 hover:bg-purple-800 text-white font-medium py-2 px-4 rounded"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
