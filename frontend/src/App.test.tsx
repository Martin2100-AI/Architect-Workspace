import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { getAuthToken } from './services/authTokenStore';

jest.mock('./services/authTokenStore');
jest.mock('./pages/LoginPage', () => ({ LoginPage: () => <div>login page</div> }));
jest.mock('./pages/PropertyFeedPage', () => ({ PropertyFeedPage: () => <div>feed page</div> }));

const mockedGetAuthToken = getAuthToken as jest.MockedFunction<typeof getAuthToken>;

describe('App', () => {
  it('shows the login page when there is no session token', () => {
    mockedGetAuthToken.mockReturnValue(null);

    render(<App />);

    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows the property feed when a session token is already present', () => {
    mockedGetAuthToken.mockReturnValue('a-real-token');

    render(<App />);

    expect(screen.getByText('feed page')).toBeInTheDocument();
  });
});
