import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold">
              Bale Tracker
            </Link>
            {user && (
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/deliveries"
                  className="hover:bg-blue-700 px-3 py-2 rounded transition"
                >
                  Deliveries
                </Link>
                <Link
                  to="/bales"
                  className="hover:bg-blue-700 px-3 py-2 rounded transition"
                >
                  Bales
                </Link>
                {isAdmin() && (
                  <>
                    <Link
                      to="/users"
                      className="hover:bg-blue-700 px-3 py-2 rounded transition"
                    >
                      Users
                    </Link>
                    <Link
                      to="/settings"
                      className="hover:bg-blue-700 px-3 py-2 rounded transition"
                    >
                      Settings
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm">
                {user.username} <span className="text-blue-200">({user.role})</span>
              </span>
              <button
                onClick={handleLogout}
                className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Mobile menu */}
      {user && (
        <div className="md:hidden border-t border-blue-500">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/deliveries"
              className="block hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              Deliveries
            </Link>
            <Link
              to="/bales"
              className="block hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              Bales
            </Link>
            {isAdmin() && (
              <>
                <Link
                  to="/users"
                  className="block hover:bg-blue-700 px-3 py-2 rounded transition"
                >
                  Users
                </Link>
                <Link
                  to="/settings"
                  className="block hover:bg-blue-700 px-3 py-2 rounded transition"
                >
                  Settings
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
