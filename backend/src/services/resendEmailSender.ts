import { createHash } from 'crypto';
import { Resend } from 'resend';
import { EmailSender } from './notificationService';

const RESEND_TIMEOUT_MS = 10000;

export class ResendUpstreamError extends Error {
  constructor(message = 'The email delivery service is temporarily unavailable') {
    super(message);
    this.name = 'ResendUpstreamError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Resend request timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Real password-reset email delivery via Resend, replacing ConsoleEmailSender.
 * No automatic retry: a failed send here is caught and logged by the caller
 * (passwordResetService.requestPasswordReset), which never lets a delivery failure
 * change the route's response — retrying blindly on top of that risks a duplicate
 * email once transient errors clear on their own, with no benefit (the user can
 * just submit the forgot-password form again, which is the real retry path). The
 * idempotency key below still protects against this class ever double-sending for
 * the exact same token.
 */
export class ResendEmailSender implements EmailSender {
  private readonly client: Resend;
  private readonly fromEmail: string;
  private readonly appBaseUrl: string;

  constructor(apiKey: string, fromEmail: string, appBaseUrl: string) {
    this.client = new Resend(apiKey);
    this.fromEmail = fromEmail;
    this.appBaseUrl = appBaseUrl;
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.appBaseUrl}/?token=${encodeURIComponent(resetToken)}`;
    const idempotencyKey = createHash('sha256').update(resetToken).digest('hex');

    let result;
    try {
      result = await withTimeout(
        this.client.emails.send(
          {
            from: this.fromEmail,
            to,
            subject: 'Reset your Keysy password',
            text: [
              'Someone requested a password reset for your Keysy account.',
              '',
              `If this was you, reset your password here: ${resetUrl}`,
              '',
              "If you didn't request this, you can safely ignore this email.",
            ].join('\n'),
          },
          { idempotencyKey },
        ),
        RESEND_TIMEOUT_MS,
      );
    } catch (err) {
      const errorClass = err instanceof Error ? err.constructor.name : 'UnknownError';
      console.error(JSON.stringify({ level: 'error', event: 'resend_call_failed', error_class: errorClass }));
      throw new ResendUpstreamError();
    }

    if (result.error) {
      console.error(
        JSON.stringify({ level: 'error', event: 'resend_send_failed', error_class: result.error.name }),
      );
      throw new ResendUpstreamError();
    }
  }
}
