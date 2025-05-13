import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';
import { Database } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="bg-[#509fe0] text-white md:w-1/2 p-8 flex flex-col justify-center items-center">
        <div className="max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <Database className="w-16 h-16" />
          </div>
          <span className="text-4xl font-yeseva mb-6 block">boost</span>
          <p className="text-xl mb-8">
            The intelligent audience platform for data-driven marketing campaigns
          </p>
          <div className="space-y-4 text-left bg-blue-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-semibold">Why choose Boost Data?</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Access to curated audience segments</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>AI-powered audience recommendations</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Seamless integration with major platforms</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Expert support for your campaigns</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="bg-white md:w-1/2 p-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;