import { EmailSender } from '../services/notificationService';

export class CapturingEmailSender implements EmailSender {
  sentTo?: string;
  sentToken?: string;

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    this.sentTo = to;
    this.sentToken = resetToken;
  }
}
