import { EmailSender, TourConfirmationDetails } from '../services/notificationService';

export class CapturingEmailSender implements EmailSender {
  sentTo?: string;
  sentToken?: string;
  sentTourConfirmationTo?: string;
  sentTourConfirmationDetails?: TourConfirmationDetails;
  // Test-only injectable failure, so a route test can exercise the "confirmation
  // email delivery failed" path (e.g. tourRequestRoutes.ts's best-effort send)
  // without a separate fake EmailSender class or widening TestApp.emailSender's
  // type away from CapturingEmailSender, which authRoutes.test.ts already relies on.
  shouldFailTourConfirmation = false;

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    this.sentTo = to;
    this.sentToken = resetToken;
  }

  async sendTourConfirmationEmail(to: string, details: TourConfirmationDetails): Promise<void> {
    if (this.shouldFailTourConfirmation) {
      throw new Error('simulated tour confirmation delivery failure');
    }
    this.sentTourConfirmationTo = to;
    this.sentTourConfirmationDetails = details;
  }
}
