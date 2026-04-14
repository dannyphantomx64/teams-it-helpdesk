import { config } from '../config/config';

export interface EscalationTicket {
  employeeName: string;
  issueCategory: string;
  description: string;
  urgency: string;
  timestamp: string;
}

export class EscalationService {
  async createTicket(ticket: EscalationTicket): Promise<{ ticketId: string; message: string }> {
    const ticketId = `IT-${Date.now().toString(36).toUpperCase()}`;

    console.log('[Escalation] New ticket created:', { ticketId, ...ticket });

    // If a Power Automate webhook is configured, forward the ticket
    if (config.escalationWebhookUrl) {
      try {
        const response = await fetch(config.escalationWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, ...ticket }),
        });

        if (!response.ok) {
          console.error('[Escalation] Webhook failed:', response.status);
        }
      } catch (err) {
        console.error('[Escalation] Webhook error:', err);
      }
    }

    return {
      ticketId,
      message: `Your IT support ticket **${ticketId}** has been created. The IT team will follow up with you shortly.`,
    };
  }
}
