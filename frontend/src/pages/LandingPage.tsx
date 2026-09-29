import React from 'react';
import houseIcon from '../assets/house-icon.png';
import './LandingPage.css';

interface LandingPageProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

// A real listing photo already seen elsewhere in this app (via the SimplyRETS MLS
// feed, same demo dataset as PropertyCard/PropertyDetailPage) -- used blurred as the
// landing page's background rather than a bundled asset, consistent with how this app
// already treats every property image as an external URL, not a local file.
const BACKGROUND_HOUSE_IMAGE_URL = 'https://d2bd5h5te3s67r.cloudfront.net/trial/home9.jpg';

// Logged-out entry point. Login/Signup no longer take over the whole screen — they
// open as a popup (see Modal.tsx) on top of this page instead.
export function LandingPage({ onLoginClick, onSignupClick }: LandingPageProps): JSX.Element {
  return (
    <div className="landing-page">
      <div
        className="landing-page__background"
        style={{ backgroundImage: `url(${BACKGROUND_HOUSE_IMAGE_URL})` }}
      />
      <header className="landing-page__header">
        <span className="landing-page__title">
          <img src={houseIcon} alt="" className="landing-page__title-icon" />
          Keysy
        </span>
        <div className="landing-page__auth-buttons">
          <button type="button" className="landing-page__login-button" onClick={onLoginClick}>
            Log in
          </button>
          <button type="button" className="btn-primary" onClick={onSignupClick}>
            Sign up
          </button>
        </div>
      </header>
      <main className="landing-page__hero">
        <div className="landing-page__hero-copy">
          <h1>Find your next home with Keysy</h1>
          <p>Personalized property matches, affordability insights, and real MLS listings — all in one place.</p>
          <button type="button" className="btn-primary" onClick={onSignupClick}>
            Get started
          </button>
        </div>
      </main>
    </div>
  );
}
