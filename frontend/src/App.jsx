import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Deliveries from './pages/Deliveries';
import Bales from './pages/Bales';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/deliveries" />;
  }

  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/deliveries" /> : <Login />}
        />
        <Route
          path="/"
          element={<Navigate to="/deliveries" />}
        />
        <Route
          path="/deliveries"
          element={
            <PrivateRoute>
              <Deliveries />
            </PrivateRoute>
          }
        />
        <Route
          path="/deliveries/:deliveryId/bales"
          element={
            <PrivateRoute>
              <Bales />
            </PrivateRoute>
          }
        />
        <Route
          path="/bales"
          element={
            <PrivateRoute>
              <Bales />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute adminOnly={true}>
              <UserManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute adminOnly={true}>
              <Settings />
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
