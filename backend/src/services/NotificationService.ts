export class NotificationService {
  async send(notification: any) { return { success: true }; }
  async sendRefundNotification(userId: string, refund: any) { return {}; }
  async sendEnrollmentCancellationNotification(userId: string, enrollment: any) { return {}; }
  async sendCertificateIssuanceNotification(userId: string, certificate: any) { return {}; }
}
export const notificationService = new NotificationService();
