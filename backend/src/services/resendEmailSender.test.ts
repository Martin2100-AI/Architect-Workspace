const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

import { ResendEmailSender, ResendUpstreamError } from './resendEmailSender';

describe('ResendEmailSender', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('sends a password reset email with a reset link built from the app base URL', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
    const sender = new ResendEmailSender('test-key', 'Keysy <onboarding@resend.dev>', 'http://localhost:3000');

    await sender.sendPasswordResetEmail('buyer@example.com', 'a-real-token');

    expect(mockSend).toHaveBeenCalledTimes(1);
    const [payload, options] = mockSend.mock.calls[0];
    expect(payload.to).toBe('buyer@example.com');
    expect(payload.from).toBe('Keysy <onboarding@resend.dev>');
    expect(payload.text).toContain('http://localhost:3000/?token=a-real-token');
    expect(typeof options.idempotencyKey).toBe('string');
  });

  it('throws ResendUpstreamError when Resend returns an error, without leaking it', async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'invalid from address', statusCode: 422, name: 'invalid_from_address' },
    });
    const sender = new ResendEmailSender('test-key', 'Keysy <onboarding@resend.dev>', 'http://localhost:3000');

    await expect(sender.sendPasswordResetEmail('buyer@example.com', 'a-real-token')).rejects.toThrow(
      ResendUpstreamError,
    );
  });

  it('throws ResendUpstreamError when the underlying call rejects (e.g. network failure)', async () => {
    mockSend.mockRejectedValueOnce(new Error('fetch failed'));
    const sender = new ResendEmailSender('test-key', 'Keysy <onboarding@resend.dev>', 'http://localhost:3000');

    await expect(sender.sendPasswordResetEmail('buyer@example.com', 'a-real-token')).rejects.toThrow(
      ResendUpstreamError,
    );
  });

  it('uses the same idempotency key for the same reset token', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const sender = new ResendEmailSender('test-key', 'Keysy <onboarding@resend.dev>', 'http://localhost:3000');

    await sender.sendPasswordResetEmail('buyer@example.com', 'same-token');
    await sender.sendPasswordResetEmail('buyer@example.com', 'same-token');

    const [, firstOptions] = mockSend.mock.calls[0];
    const [, secondOptions] = mockSend.mock.calls[1];
    expect(firstOptions.idempotencyKey).toBe(secondOptions.idempotencyKey);
  });

  it('sends a property share email with a link built from the app base URL', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
    const sender = new ResendEmailSender('test-key', 'Keysy <onboarding@resend.dev>', 'http://localhost:3000');

    await sender.sendPropertyShareEmail('friend@example.com', {
      propertyId: 'stub-1',
      propertyAddress: '123 Maple St, Springfield, IL',
      listingPrice: 425000,
      requestId: 'req-1',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const [payload, options] = mockSend.mock.calls[0];
    expect(payload.to).toBe('friend@example.com');
    expect(payload.text).toContain('123 Maple St, Springfield, IL');
    expect(payload.text).toContain('$425,000');
    expect(payload.text).toContain('http://localhost:3000/?property=stub-1');
    expect(typeof options.idempotencyKey).toBe('string');
  });

  it('throws ResendUpstreamError when the property share send fails, without leaking the error', async () => {
    mockSend.mockRejectedValueOnce(new Error('fetch failed'));
    const sender = new ResendEmailSender('test-key', 'Keysy <onboarding@resend.dev>', 'http://localhost:3000');

    await expect(
      sender.sendPropertyShareEmail('friend@example.com', {
        propertyId: 'stub-1',
        propertyAddress: '123 Maple St, Springfield, IL',
        listingPrice: 425000,
        requestId: 'req-1',
      }),
    ).rejects.toThrow(ResendUpstreamError);
  });

  it('uses the same idempotency key for the same share requestId, so a retry cannot double-send', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const sender = new ResendEmailSender('test-key', 'Keysy <onboarding@resend.dev>', 'http://localhost:3000');
    const details = {
      propertyId: 'stub-1',
      propertyAddress: '123 Maple St, Springfield, IL',
      listingPrice: 425000,
      requestId: 'same-request-id',
    };

    await sender.sendPropertyShareEmail('friend@example.com', details);
    await sender.sendPropertyShareEmail('friend@example.com', details);

    const [, firstOptions] = mockSend.mock.calls[0];
    const [, secondOptions] = mockSend.mock.calls[1];
    expect(firstOptions.idempotencyKey).toBe(secondOptions.idempotencyKey);
  });

  it('uses a different idempotency key for a different share requestId, so a genuine second share still sends', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const sender = new ResendEmailSender('test-key', 'Keysy <onboarding@resend.dev>', 'http://localhost:3000');
    const baseDetails = {
      propertyId: 'stub-1',
      propertyAddress: '123 Maple St, Springfield, IL',
      listingPrice: 425000,
    };

    await sender.sendPropertyShareEmail('friend@example.com', { ...baseDetails, requestId: 'request-1' });
    await sender.sendPropertyShareEmail('friend@example.com', { ...baseDetails, requestId: 'request-2' });

    const [, firstOptions] = mockSend.mock.calls[0];
    const [, secondOptions] = mockSend.mock.calls[1];
    expect(firstOptions.idempotencyKey).not.toBe(secondOptions.idempotencyKey);
  });
});
