import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, TOKEN_KEY } from './api';
import { AuthPage } from './AuthPage';
import { Dashboard } from './Dashboard';
import type { Session, User } from './types';
import './styles.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!sessionStorage.getItem(TOKEN_KEY));
  const [restoreError, setRestoreError] = useState('');
  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setRestoreError('');
  }
  async function restore() {
    setLoading(true);
    setRestoreError('');
    try {
      setUser((await api<{ user: User }>('/auth/me')).user);
    } catch (error) {
      if (sessionStorage.getItem(TOKEN_KEY)) setRestoreError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (sessionStorage.getItem(TOKEN_KEY)) void restore();
    window.addEventListener('session-expired', logout);
    return () => window.removeEventListener('session-expired', logout);
  }, []);
  function signIn(session: Session) {
    sessionStorage.setItem(TOKEN_KEY, session.token);
    setUser(session.user);
  }
  if (loading)
    return (
      <div className="app-loading" role="status">
        Opening your showroom…
      </div>
    );
  if (restoreError)
    return (
      <div className="app-loading">
        <p role="alert">{restoreError}</p>
        <button className="button primary" onClick={() => void restore()}>
          Retry
        </button>
        <button className="button secondary" onClick={logout}>
          Return to sign in
        </button>
      </div>
    );
  return user ? <Dashboard user={user} onLogout={logout} /> : <AuthPage onSignIn={signIn} />;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
