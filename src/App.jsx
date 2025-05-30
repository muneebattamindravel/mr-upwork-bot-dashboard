// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import KBManager from './pages/kbManager';
import PrivateRoute from './components/privateRoute';
import Layout from './components/Layout';
import { Toaster } from 'sonner';
import JobsPage from './pages/jobsPage';

const App = () => {
  return (
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/jobs" />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/kb"
            element={
              <PrivateRoute>
                <Layout>
                  <KBManager />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/jobs"
            element={
              <PrivateRoute>
                <Layout>
                  <JobsPage />
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>

      </BrowserRouter>
  );
};

export default App;
