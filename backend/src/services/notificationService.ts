export interface EmailSender {
  sendPasswordResetEmail(to: string, resetToken: string): Promise<void>;
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
}
