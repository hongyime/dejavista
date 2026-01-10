import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function SignIn() {
  const { signIn } = useAuth();

  return (
    <div className="empty-state">
      <div className="empty-state-icon">👔</div>
      <h3>Welcome to DejaVista</h3>
      <p>Sign in with Google to start tracking your fashion browsing</p>
      <button className="btn btn-primary" onClick={signIn} style={{ marginTop: '24px', width: '100%' }}>
        Sign in with Google
      </button>
    </div>
  );
}
