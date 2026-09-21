export interface TourConfirmationDetails {
  tourRequestId: number;
  propertyAddress: string;
  requestedAt: Date;
}

export interface PropertyShareDetails {
  propertyId: string;
  propertyAddress: string;
  listingPrice: number;
  /** Client-supplied, stable per share attempt -- used to derive an idempotency key so a
   * retried request can't double-send the same share. A new deliberate share generates a
   * new requestId, so this never blocks a genuine second share. */
  requestId: string;
}

export interface EmailSender {
  sendPasswordResetEmail(to: string, resetToken: string): Promise<void>;
  sendTourConfirmationEmail(to: string, details: TourConfirmationDetails): Promise<void>;
  sendPropertyShareEmail(to: string, details: PropertyShareDetails): Promise<void>;
}

/**
 * Placeholder sender: logs that a reset was requested but does not deliver anything.
 * Used only when RESEND_API_KEY isn't configured — see ResendEmailSender for the real
 * implementation and server.ts for how the two are selected between.
 */
export class ConsoleEmailSender implements EmailSender {
  async sendPasswordResetEmail(to: string, _resetToken: string): Promise<void> {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'password_reset_email_not_sent',
        to,
        note: 'No production email service is configured — the reset token was not delivered to the user.',
      }),
    );
  }

  async sendTourConfirmationEmail(to: string, details: TourConfirmationDetails): Promise<void> {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'tour_confirmation_email_not_sent',
        to,
        tourRequestId: details.tourRequestId,
        note: 'No production email service is configured — the tour confirmation was not delivered to the user.',
      }),
    );
  }

  async sendPropertyShareEmail(to: string, details: PropertyShareDetails): Promise<void> {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'property_share_email_not_sent',
        to,
        propertyId: details.propertyId,
        note: 'No production email service is configured — the shared property was not delivered to the recipient.',
      }),
    );
  }
}
