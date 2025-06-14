import React, { useState } from 'react';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import NotificationDropdown from '../notifications/NotificationDropdown';

const Header: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: 'Audiences', path: '/audiences', show: !!user },
    { label: 'Campaigns', path: '/campaigns', show: !!user },
    { label: 'Requests', path: '/requests', show: !!user && isAdmin },
    { label: 'Settings', path: '/settings', show: !!user },
  ].filter(item => item.show);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-3xl font-yeseva text-[#509fe0]">boost</span>
            </Link>
            
            {user && (
              <nav className="hidden md:ml-8 md:flex md:space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-[#509fe0]/10 text-[#509fe0]'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={closeMobileMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center">
            {user ? (
              <>
                <NotificationDropdown />
                
                <div className="relative ml-3 flex items-center">
                  <div className="flex items-center space-x-2">
                    <span className="hidden md:block text-sm font-medium text-gray-700">
                      {user.name}
                    </span>
                    <div className="bg-[#509fe0] text-white rounded-full h-8 w-8 flex items-center justify-center">
                      <User size={18} />
                    </div>
                  </div>
                  
                  <button
                    onClick={logout}
                    className="ml-2 p-2 text-gray-500 hover:text-gray-700 hidden md:block"
                    title="Sign out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
                
                <div className="flex md:hidden ml-3">
                  <button
                    onClick={toggleMobileMenu}
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
                  >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login">
                <Button variant="primary">Sign In</Button>
              </Link>
            )}
          </div>
        </div>

        {isMobileMenuOpen && user && (
          <div className="md:hidden pb-4">
            <div className="space-y-1 px-2 pt-2 pb-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive(item.path)
                      ? 'bg-[#509fe0]/10 text-[#509fe0]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={logout}
                className="flex items-center w-full px-3 py-2 mt-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                <LogOut size={18} className="mr-2" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;