import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TaxonomyProvider } from './context/TaxonomyContext';
import { CampaignProvider } from './context/CampaignContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import AudiencesPage from './pages/AudiencesPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignBuilderPage from './pages/CampaignBuilderPage';
import RequestsPage from './pages/RequestsPage';
import SettingsPage from './pages/SettingsPage';

// Components
import PrivateRoute from './components/auth/PrivateRoute';

const App: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthProvider>
        <NotificationProvider>
          <TaxonomyProvider>
            <CampaignProvider>
              <Router>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  
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
        </NotificationProvider>
      </AuthProvider>
    </Suspense>
  );
};

export default App;