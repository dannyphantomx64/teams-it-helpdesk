import { EscalationService } from '../../services/escalation';

describe('EscalationService', () => {
  let service: EscalationService;

  beforeEach(() => {
    service = new EscalationService();
  });

  it('creates a ticket with a unique ID', async () => {
    const result = await service.createTicket({
      employeeName: 'Jane Smith',
      issueCategory: 'vpn',
      description: 'VPN will not connect',
      urgency: 'high',
      timestamp: new Date().toISOString(),
    });

    expect(result.ticketId).toMatch(/^IT-[A-Z0-9]+$/);
    expect(result.message).toContain(result.ticketId);
  });

  it('generates different IDs for different tickets', async () => {
    const result1 = await service.createTicket({
      employeeName: 'User A',
      issueCategory: 'email',
      description: 'Issue 1',
      urgency: 'low',
      timestamp: new Date().toISOString(),
    });

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result2 = await service.createTicket({
      employeeName: 'User B',
      issueCategory: 'printer',
      description: 'Issue 2',
      urgency: 'medium',
      timestamp: new Date().toISOString(),
    });

    expect(result1.ticketId).not.toBe(result2.ticketId);
  });
});
