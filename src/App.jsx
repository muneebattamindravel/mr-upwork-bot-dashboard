// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import KBManager from './pages/kbManager';
import PrivateRoute from './components/privateRoute';
import Layout from './components/layout';
import { Toaster } from 'sonner';
import JobsPage from './pages/jobsPage';
import BotMonitor from './pages/botMonitor';
import RelevanceSettings from './pages/relevanceSettings';

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

          <Route
            path="/bots"
            element={
              <PrivateRoute>
                <Layout>
                  <BotMonitor />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/relevanceSettings"
            element={
              <PrivateRoute>
                <Layout>
                  <RelevanceSettings />
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>

      </BrowserRouter>
  );
};

export default App;
