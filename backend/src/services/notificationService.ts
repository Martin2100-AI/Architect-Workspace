export interface TourConfirmationDetails {
  tourRequestId: number;
  propertyAddress: string;
  requestedAt: Date;
}

export interface EmailSender {
  sendPasswordResetEmail(to: string, resetToken: string): Promise<void>;
  sendTourConfirmationEmail(to: string, details: TourConfirmationDetails): Promise<void>;
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
}
