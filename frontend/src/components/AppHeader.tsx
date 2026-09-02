import React from 'react';

interface AppHeaderProps {
  onLogout: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps): JSX.Element {
  return (
    <header className="app-header">
      <span className="app-header__title">Keysy</span>
      <button type="button" onClick={onLogout}>
        Log out
      </button>
    </header>
  );
}
