import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TourRequestPage } from './TourRequestPage';
import { fetchPropertyById, MlsUnavailableError, PropertyNotFoundError } from '../services/propertyService';
import {
  NotAuthenticatedError,
  requestTour,
  TourRequestValidationError,
} from '../services/tourRequestService';
import { Property } from '../types/property';

jest.mock('../services/propertyService');
jest.mock('../services/tourRequestService', () => ({
  ...jest.requireActual('../services/tourRequestService'),
  requestTour: jest.fn(),
}));

const mockedFetchPropertyById = fetchPropertyById as jest.MockedFunction<typeof fetchPropertyById>;
const mockedRequestTour = requestTour as jest.MockedFunction<typeof requestTour>;

const sampleProperty: Property = {
  id: 'p1',
  imageUrl: 'https://example.com/photo.jpg',
  listingPrice: 400000,
  address: '1 Test St',
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1500,
  propertyType: 'single-family',
  estimatedMonthlyPayment: 2500,
};

function fillRequiredFields(): void {
  fireEvent.change(screen.getByLabelText(/preferred date/i), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText(/preferred time/i), { target: { value: '14:30' } });
  fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Jordan Buyer' } });
  fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '555-0100' } });
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'jordan@example.com' } });
}

describe('TourRequestPage', () => {
  it('shows the property this tour request is for once loaded', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<TourRequestPage propertyId="p1" onBack={jest.fn()} />);

    expect(await screen.findByText('1 Test St')).toBeInTheDocument();
    expect(mockedFetchPropertyById).toHaveBeenCalledWith('p1');
  });

  it('submits the form and shows a confirmation message when the email was sent', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    mockedRequestTour.mockResolvedValueOnce({
      tourRequest: {
        id: 1,
        propertyId: 'p1',
        requestedAt: '2026-10-01T14:30:00.000Z',
        buyerEmail: 'jordan@example.com',
        buyerName: 'Jordan Buyer',
        phoneNumber: '555-0100',
        notes: null,
        alreadyScheduled: false,
      },
      confirmationSent: true,
      confirmationSkippedByPreference: false,
    });

    render(<TourRequestPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /request tour/i }));

    expect(await screen.findByText(/confirmation email has been sent to jordan@example.com/i)).toBeInTheDocument();
    expect(mockedRequestTour).toHaveBeenCalledWith({
      propertyId: 'p1',
      preferredDate: '2026-10-01',
      preferredTime: '14:30',
      buyerName: 'Jordan Buyer',
      phoneNumber: '555-0100',
      email: 'jordan@example.com',
      message: undefined,
    });
  });

  // Failure path: confirmation is not received -- the page must say so honestly,
  // not claim success it can't back up.
  it('shows the request was received even when the confirmation email could not be sent', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    mockedRequestTour.mockResolvedValueOnce({
      tourRequest: {
        id: 1,
        propertyId: 'p1',
        requestedAt: '2026-10-01T14:30:00.000Z',
        buyerEmail: 'jordan@example.com',
        buyerName: 'Jordan Buyer',
        phoneNumber: '555-0100',
        notes: null,
        alreadyScheduled: false,
      },
      confirmationSent: false,
      confirmationSkippedByPreference: false,
    });

    render(<TourRequestPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /request tour/i }));

    expect(await screen.findByText(/could not send a confirmation email/i)).toBeInTheDocument();
  });

  // STORY-009 / REQ-012: given a notification is disabled, the page must say so
  // honestly -- distinct from an actual delivery failure, since disabling was the
  // buyer's own choice, not a problem with the app.
  it('shows a distinct message when the buyer has disabled tour-confirmation notifications', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    mockedRequestTour.mockResolvedValueOnce({
      tourRequest: {
        id: 1,
        propertyId: 'p1',
        requestedAt: '2026-10-01T14:30:00.000Z',
        buyerEmail: 'jordan@example.com',
        buyerName: 'Jordan Buyer',
        phoneNumber: '555-0100',
        notes: null,
        alreadyScheduled: false,
      },
      confirmationSent: false,
      confirmationSkippedByPreference: true,
    });

    render(<TourRequestPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /request tour/i }));

    expect(await screen.findByText(/turned off tour confirmation emails/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not send a confirmation email/i)).not.toBeInTheDocument();
  });

  it('shows an error message when the backend rejects incomplete or invalid details', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    mockedRequestTour.mockRejectedValueOnce(new TourRequestValidationError());

    render(<TourRequestPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /request tour/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/check the highlighted fields/i);
  });

  it('shows a not-authenticated message without crashing', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    mockedRequestTour.mockRejectedValueOnce(new NotAuthenticatedError());

    render(<TourRequestPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /request tour/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/need to be logged in/i);
  });

  it('shows a not-found message for an unknown property, without crashing', async () => {
    mockedFetchPropertyById.mockRejectedValueOnce(new PropertyNotFoundError());

    render(<TourRequestPage propertyId="does-not-exist" onBack={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be found/i);
  });

  it('shows an MLS-unavailable message instead of crashing when the MLS API is down', async () => {
    mockedFetchPropertyById.mockRejectedValueOnce(new MlsUnavailableError());

    render(<TourRequestPage propertyId="p1" onBack={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach the MLS/i);
  });

  it('calls onBack when "Back to property" is clicked', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    const onBack = jest.fn();

    render(<TourRequestPage propertyId="p1" onBack={onBack} />);
    await screen.findByText('1 Test St');

    fireEvent.click(screen.getByRole('button', { name: /back to property/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
