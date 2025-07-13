import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronRight, Mail, Building, AlertCircle } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';

const SignUpForm: React.FC = () => {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    companyName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.email || !formData.password || !formData.name || !formData.companyName) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.companyName.trim().length < 2) {
      setError('Company name must be at least 2 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        companyName: formData.companyName.trim()
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-6">
          <Mail size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Boost!</h2>
        <p className="text-gray-600 mb-4">
          Your account has been created successfully.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Building size={20} className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-sm font-medium text-blue-900 mb-1">Company Admin Status</h3>
              <p className="text-sm text-blue-700">
                {formData.email.endsWith('@boostdata.io') 
                  ? 'You have been granted Super Admin privileges with access to all platform features.'
                  : `You are now the administrator for "${formData.companyName}" and can invite team members.`
                }
              </p>
            </div>
          </div>
        </div>
        <Link to="/login">
          <Button variant="primary" icon={<ChevronRight size={18} />}>
            Continue to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
        <p className="mt-2 text-gray-600">Start managing your audience campaigns</p>
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
      
      {showEmailForm ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="John Smith"
            required
            autoFocus
          />
          
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@company.com"
            required
          />
          
          <Input
            label="Company Name"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Acme Inc."
            required
            helpText="If this company doesn't exist, it will be created and you'll become the admin."
          />
          
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
          
          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Building size={20} className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">Company Admin Benefits</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Invite and manage team members</li>
                  <li>• View all company campaigns and requests</li>
                  <li>• Assign admin roles to other team members</li>
                  <li>• Manage company account settings</li>
                </ul>
              </div>
            </div>
          </div>
          
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            icon={<ChevronRight size={18} />}
          >
            Create Account
          </Button>
          
          <div className="relative flex items-center justify-center mt-4">
            <div className="border-t border-gray-300 absolute w-full"></div>
            <div className="bg-white px-4 relative text-sm text-gray-500">or</div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => setShowEmailForm(false)}
          >
            Back to sign up options
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Building size={20} className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">Create Your Company Account</h3>
                <p className="text-sm text-blue-700">
                  After signing up, you'll be prompted to create or join a company.
                </p>
              </div>
            </div>
          </div>
          
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: {
                  borderRadius: '0.375rem',
                  height: '2.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }
              },
              variables: {
                default: {
                  colors: {
                    brand: '#0d5cdf',
                    brandAccent: '#0942a1'
                  }
                }
              }
            }}
            providers={['google']}
            onlyThirdPartyProviders={true}
            redirectTo={`${window.location.origin}/signup`}
            view="sign_up"
          />
          
          <div className="relative flex items-center justify-center mt-4">
            <div className="border-t border-gray-300 absolute w-full"></div>
            <div className="bg-white px-4 relative text-sm text-gray-500">or</div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => setShowEmailForm(true)}
            icon={<Mail size={18} />}
          >
            Continue with Email
          </Button>
        </div>
      )}
      
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default SignUpForm;