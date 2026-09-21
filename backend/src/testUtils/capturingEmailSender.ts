import { EmailSender, PropertyShareDetails, TourConfirmationDetails } from '../services/notificationService';

export class CapturingEmailSender implements EmailSender {
  sentTo?: string;
  sentToken?: string;
  sentTourConfirmationTo?: string;
  sentTourConfirmationDetails?: TourConfirmationDetails;
  sentPropertyShareTo?: string;
  sentPropertyShareDetails?: PropertyShareDetails;
  // Test-only injectable failures, so a route test can exercise a "delivery failed" path
  // (e.g. tourRequestRoutes.ts's best-effort send, or propertyShareRoutes.ts's non-best-effort
  // one) without a separate fake EmailSender class or widening TestApp.emailSender's type away
  // from CapturingEmailSender, which authRoutes.test.ts already relies on.
  shouldFailTourConfirmation = false;
  shouldFailPropertyShare = false;

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

  async sendPropertyShareEmail(to: string, details: PropertyShareDetails): Promise<void> {
    if (this.shouldFailPropertyShare) {
      throw new Error('simulated property share delivery failure');
    }
    this.sentPropertyShareTo = to;
    this.sentPropertyShareDetails = details;
  }
}
