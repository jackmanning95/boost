import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  
  console.log('PrivateRoute: Rendering with user:', !!user, 'loading:', loading);
  
  // Simplified loading check - just show a brief message
  if (loading) {
    console.log('PrivateRoute: Still loading auth state');
    return <div>Loading...</div>;
  }
  
  if (!user) {
    console.log('PrivateRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('PrivateRoute: User authenticated, rendering protected content');
  return <>{children}</>;
};

export default PrivateRoute;