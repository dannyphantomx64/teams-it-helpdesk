import { NotificationService } from '../../services/notifications';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  it('creates a notification with a unique ID', () => {
    const notif = service.create({
      title: 'Email Outage',
      message: 'Outlook is experiencing intermittent issues.',
      severity: 'warning',
    });

    expect(notif.id).toMatch(/^NOTIF-[A-Z0-9]+$/);
    expect(notif.active).toBe(true);
    expect(notif.title).toBe('Email Outage');
  });

  it('returns only active notifications', () => {
    service.create({ title: 'Active', message: 'Still happening', severity: 'info' });
    const n2 = service.create({ title: 'Resolved', message: 'Fixed now', severity: 'info' });
    service.deactivate(n2.id);

    const active = service.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Active');
  });

  it('auto-expires notifications past their expiresAt date', () => {
    service.create({
      title: 'Expired',
      message: 'This already expired',
      severity: 'info',
      expiresAt: new Date(Date.now() - 60000).toISOString(),
    });

    expect(service.getActive()).toHaveLength(0);
  });

  it('returns all notifications including inactive', () => {
    service.create({ title: 'A', message: 'a', severity: 'info' });
    const n = service.create({ title: 'B', message: 'b', severity: 'warning' });
    service.deactivate(n.id);

    expect(service.getAll()).toHaveLength(2);
  });

  it('returns false when deactivating nonexistent ID', () => {
    expect(service.deactivate('NOTIF-FAKE')).toBe(false);
  });
});
