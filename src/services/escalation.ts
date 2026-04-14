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

    // Route to all configured webhooks
    const webhooks = this.getWebhooks(ticket.issueCategory);
    await Promise.allSettled(webhooks.map((url) => this.sendWebhook(url, ticketId, ticket)));

    return {
      ticketId,
      message: `Your IT support ticket **${ticketId}** has been created. The IT team will follow up with you shortly.`,
    };
  }

  private getWebhooks(category: string): string[] {
    const urls: string[] = [];

    // General Power Automate webhook
    if (config.escalationWebhookUrl) {
      urls.push(config.escalationWebhookUrl);
    }

    // ServiceNow — hardware and software categories
    if (config.servicenowWebhookUrl && ['hardware', 'software'].includes(category)) {
      urls.push(config.servicenowWebhookUrl);
    }

    // Jira — all tickets
    if (config.jiraWebhookUrl) {
      urls.push(config.jiraWebhookUrl);
    }

    return urls;
  }

  private async sendWebhook(url: string, ticketId: string, ticket: EscalationTicket): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, ...ticket }),
      });

      if (!response.ok) {
        console.error(`[Escalation] Webhook failed (${url}):`, response.status);
      } else {
        console.log(`[Escalation] Webhook sent to ${url}`);
      }
    } catch (err) {
      console.error(`[Escalation] Webhook error (${url}):`, err);
    }
  }
}
