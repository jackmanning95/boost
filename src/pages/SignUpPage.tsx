import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SignUpForm from '../components/auth/SignUpForm';

const SignUpPage: React.FC = () => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="bg-[#509fe0] text-white md:w-1/2 p-8 flex flex-col justify-center items-center">
        <div className="max-w-md text-center">
          <span className="text-4xl font-yeseva mb-6 block">boost</span>
          <p className="text-xl mb-8">
            Join the intelligent audience platform for data-driven marketing campaigns
          </p>
          <div className="space-y-4 text-left bg-blue-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-semibold">Get started with Boost Data</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Access curated audience segments</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>AI-powered recommendations</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Multi-platform activation</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Expert campaign support</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="bg-white md:w-1/2 p-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;