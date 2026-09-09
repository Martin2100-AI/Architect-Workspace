import React, { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { PropertyFeedPage } from './pages/PropertyFeedPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SavedHomesPage } from './pages/SavedHomesPage';
import { SignupPage } from './pages/SignupPage';
import { logout } from './services/authService';
import { getAuthToken, setAuthToken } from './services/authTokenStore';

type AuthView = 'login' | 'signup' | 'forgot-password';
type LoggedInView = 'feed' | 'saved-homes';

function getResetTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('token');
}

function App(): JSX.Element {
  const [isLoggedIn, setIsLoggedIn] = useState(() => getAuthToken() !== null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [loggedInView, setLoggedInView] = useState<LoggedInView>('feed');
  const [resetToken, setResetToken] = useState<string | null>(getResetTokenFromUrl);

  async function handleLogout(): Promise<void> {
    // Clear the local session regardless of whether the network call succeeds —
    // the user's immediate goal is to be logged out on this device. A dropped
    // revoke request just means the token stays technically valid server-side
    // until its 1h expiry, which is the same fallback this app already accepts
    // for logout under a stateless JWT design.
    try {
      await logout();
    } catch {
      // intentionally ignored — see comment above
    }
    setAuthToken(null);
    setIsLoggedIn(false);
    setAuthView('login');
  }

  // A password-reset link takes priority over whatever else is on screen, since
  // landing here means the user followed an emailed link with a specific intent.
  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onResetSuccess={() => {
          setResetToken(null);
          setAuthView('login');
        }}
      />
    );
  }

  if (!isLoggedIn) {
    if (authView === 'signup') {
      return (
        <SignupPage
          onSignupSuccess={() => setIsLoggedIn(true)}
          onBackToLogin={() => setAuthView('login')}
        />
      );
    }

    if (authView === 'forgot-password') {
      return <ForgotPasswordPage onBackToLogin={() => setAuthView('login')} />;
    }

    return (
      <LoginPage
        onLoginSuccess={() => setIsLoggedIn(true)}
        onSignupClick={() => setAuthView('signup')}
        onForgotPasswordClick={() => setAuthView('forgot-password')}
      />
    );
  }

  return (
    <>
      <AppHeader
        onLogout={handleLogout}
        onNavigateSavedHomes={loggedInView === 'feed' ? () => setLoggedInView('saved-homes') : undefined}
      />
      {loggedInView === 'saved-homes' ? (
        <SavedHomesPage onBack={() => setLoggedInView('feed')} />
      ) : (
        <PropertyFeedPage />
      )}
    </>
  );
}

export default App;
