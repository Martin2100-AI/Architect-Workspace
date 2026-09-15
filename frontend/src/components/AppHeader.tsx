import React from 'react';

interface AppHeaderProps {
  onLogout: () => void;
  /** Only present where a logged-in view actually has a Saved Homes page to link to. */
  onNavigateSavedHomes?: () => void;
  /** Only present where a logged-in view actually has a Buyer Profile page to link to. */
  onNavigateProfile?: () => void;
}

export function AppHeader({ onLogout, onNavigateSavedHomes, onNavigateProfile }: AppHeaderProps): JSX.Element {
  return (
    <header className="app-header">
      <span className="app-header__title">Keysy</span>
      {onNavigateSavedHomes && (
        <button type="button" onClick={onNavigateSavedHomes}>
          Saved Homes
        </button>
      )}
      {onNavigateProfile && (
        <button type="button" onClick={onNavigateProfile}>
          Buyer Profile
        </button>
      )}
      <button type="button" onClick={onLogout}>
        Log out
      </button>
    </header>
  );
}
