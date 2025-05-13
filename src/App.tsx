import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TaxonomyProvider } from './context/TaxonomyContext';
import { CampaignProvider } from './context/CampaignContext';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AudiencesPage from './pages/AudiencesPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignBuilderPage from './pages/CampaignBuilderPage';
import RequestsPage from './pages/RequestsPage';
import SettingsPage from './pages/SettingsPage';

// Components
import PrivateRoute from './components/auth/PrivateRoute';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TaxonomyProvider>
        <CampaignProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected routes */}
              <Route 
                path="/audiences" 
                element={
                  <PrivateRoute>
                    <AudiencesPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/campaigns" 
                element={
                  <PrivateRoute>
                    <CampaignsPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/campaigns/new" 
                element={
                  <PrivateRoute>
                    <CampaignsPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/campaign/build" 
                element={
                  <PrivateRoute>
                    <CampaignBuilderPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/requests" 
                element={
                  <PrivateRoute>
                    <RequestsPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <PrivateRoute>
                    <SettingsPage />
                  </PrivateRoute>
                } 
              />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </CampaignProvider>
      </TaxonomyProvider>
    </AuthProvider>
  );
};

export default App;