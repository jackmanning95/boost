import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronRight, Mail, AlertCircle } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';

const LoginForm: React.FC = () => {
  const { login, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
        <p className="mt-2 text-gray-600">Sign in to your Boost Data account</p>
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
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
          />
          
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                Remember me
              </label>
            </div>
            
            <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Forgot password?
            </a>
          </div>
          
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            icon={<ChevronRight size={18} />}
          >
            Sign in
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
            Back to sign in options
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
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
            redirectTo={`${window.location.origin}/login`}
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

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-500 font-medium">
              Sign up
            </Link>
          </p>
        </div>
    </div>
  );
};

export default LoginForm;