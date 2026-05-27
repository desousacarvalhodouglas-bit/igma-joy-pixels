import React, { useEffect, useState } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './i18n';
import './App.css';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import FeedPage from './pages/FeedPage';
import AIChat from './pages/AIChat';
import MessagesPage from './pages/MessagesPage';
import ServicesPage from './pages/ServicesPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import DirectChatPage from './pages/DirectChatPage';
import VolunteersPage from './pages/VolunteersPage';
import VolunteerRegisterPage from './pages/VolunteerRegisterPage';
import NearbyHelpersPage from './pages/NearbyHelpersPage';
import MapPage from './pages/MapPage';
import JobsPage from './pages/JobsPage';
import HousingPage from './pages/HousingPage';
import SubscriptionPage from './pages/SubscriptionPage';
import { AuthContext } from './ClonedAuthContext';

const backendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

export function ClonedAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  useTranslation();

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cancelled && response.ok) {
          setUser(await response.json());
        } else if (!cancelled) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const previewUser = user || {
    id: 'preview-user',
    name: 'Usuário Preview',
    role: 'admin',
    email: 'preview@watizat.local',
  };

  return <AuthContext.Provider value={{ user: previewUser, token: token || 'preview-token', login, logout }}>{children}</AuthContext.Provider>;
}

export function clonedRoutes(user) {
  const previewUser = user || {
    id: 'preview-user',
    name: 'Usuário Preview',
    role: 'admin',
    email: 'preview@watizat.local',
  };

  return [
    <Route key="cloned-root" path="/" element={!user ? <LandingPage /> : <Navigate to="/home" />} />,
    <Route key="cloned-servicos" path="/servicos" element={!user ? <LandingPage /> : <Navigate to="/home" />} />,
    <Route key="cloned-auth" path="/auth" element={!user ? <AuthPage /> : <Navigate to="/home" />} />,
    <Route key="cloned-servicos-auth" path="/servicos/auth" element={!user ? <AuthPage /> : <Navigate to="/home" />} />,
    <Route key="cloned-home" path="/home" element={<FeedPage />} />,
    <Route key="cloned-servicos-home" path="/servicos/home" element={<FeedPage />} />,
    <Route key="cloned-home-old" path="/home-old" element={<HomePage />} />,
    <Route key="cloned-chat" path="/chat" element={<MessagesPage />} />,
    <Route key="cloned-servicos-chat" path="/servicos/chat" element={<MessagesPage />} />,
    <Route key="cloned-ai-chat" path="/ai-chat" element={<AIChat />} />,
    <Route key="cloned-services" path="/services" element={<ServicesPage />} />,
    <Route key="cloned-ofertantes" path="/servicos/ofertantes" element={<VolunteersPage />} />,
    <Route key="cloned-profile" path="/profile" element={<ProfilePage />} />,
    <Route key="cloned-servicos-profile" path="/servicos/perfil" element={<ProfilePage />} />,
    <Route key="cloned-admin" path="/admin" element={previewUser.role === 'admin' ? <AdminDashboard /> : <Navigate to="/home" />} />,
    <Route key="cloned-servicos-admin" path="/servicos/admin" element={previewUser.role === 'admin' ? <AdminDashboard /> : <Navigate to="/home" />} />,
    <Route key="cloned-direct-chat" path="/direct-chat/:userId" element={<DirectChatPage />} />,
    <Route key="cloned-volunteers" path="/volunteers" element={<VolunteersPage />} />,
    <Route key="cloned-jobs" path="/jobs" element={<JobsPage />} />,
    <Route key="cloned-housing" path="/housing" element={<HousingPage />} />,
    <Route key="cloned-nearby" path="/nearby" element={<NearbyHelpersPage />} />,
    <Route key="cloned-map" path="/map" element={<MapPage />} />,
    <Route key="cloned-volunteer-register" path="/volunteer-register" element={<VolunteerRegisterPage />} />,
    <Route key="cloned-assinatura" path="/assinatura" element={<SubscriptionPage />} />,
    <Route key="cloned-servicos-assinatura" path="/servicos/assinatura" element={<SubscriptionPage />} />,
  ];
}
