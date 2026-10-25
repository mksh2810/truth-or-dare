import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading, initAuthListener } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const unsub = initAuthListener();
    return () => unsub();
  }, [initAuthListener]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70dvh] space-y-4">
        <div className="w-10 h-10 border-4 border-ink border-t-highlighter rounded-full animate-spin" />
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Loading Chit Table...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If user hasn't chosen a name yet, redirect to /setup
  if (!profile?.displayName && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};
