export interface EmailSender {
  sendPasswordResetEmail(to: string, resetToken: string): Promise<void>;
}

/**
 * Placeholder sender: logs that a reset was requested but does not deliver anything.
 * This repo has no Mandrill (or other email provider) credentials configured yet — swap
 * this for a real Mandrill-backed EmailSender before shipping password reset to users.
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
