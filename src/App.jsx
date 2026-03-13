// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import StaticKnowledgeBase from './pages/StaticKnowledgeBase';
import SemanticKnowledgeBase from './pages/SemanticKnowledgeBase';
import PrivateRoute from './components/privateRoute';
import Layout from './components/layout';
import { Toaster } from 'sonner';
import JobsPage from './pages/jobsPage';
import BotMonitor from './pages/botMonitor';
import RelevanceSettings from './pages/relevanceSettings';
import NotFound from './pages/notFound';
import GlobalSettings from './pages/GlobalSettings';
import AnalyticsPage from './pages/analyticsPage';
import Playground from './pages/Playground';
import UserManagement from './pages/UserManagement';

const App = () => {
  return (
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/jobs" />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/static-knowledge-base"
            element={
              <PrivateRoute>
                <Layout>
                  <StaticKnowledgeBase />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/semantic-knowledge-base"
            element={
              <PrivateRoute>
                <Layout>
                  <SemanticKnowledgeBase />
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

          {/* /sraa-settings redirects to the merged relevance settings page */}
          <Route path="/sraa-settings" element={<Navigate to="/relevanceSettings" />} />

          <Route
            path="/globalSettings"
            element={
              <PrivateRoute>
                <Layout>
                  <GlobalSettings />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Layout>
                  <AnalyticsPage />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/playground"
            element={
              <PrivateRoute>
                <Layout>
                  <Playground />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/users"
            element={
              <PrivateRoute>
                <Layout>
                  <UserManagement />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>

      </BrowserRouter>
  );
};

export default App;
