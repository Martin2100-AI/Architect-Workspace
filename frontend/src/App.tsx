import React, { useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { PropertyFeedPage } from './pages/PropertyFeedPage';
import { getAuthToken } from './services/authTokenStore';

function App(): JSX.Element {
  const [isLoggedIn, setIsLoggedIn] = useState(() => getAuthToken() !== null);

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return <PropertyFeedPage />;
}

export default App;
