export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  active: boolean;
  createdAt: string;
  expiresAt?: string;
}

let counter = 0;

export class NotificationService {
  private notifications: Notification[] = [];

  create(input: { title: string; message: string; severity: 'info' | 'warning' | 'critical'; expiresAt?: string }): Notification {
    const notification: Notification = {
      id: `NOTIF-${Date.now().toString(36).toUpperCase()}${(counter++).toString(36).toUpperCase()}`,
      title: input.title,
      message: input.message,
      severity: input.severity,
      active: true,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };
    this.notifications.push(notification);
    console.log('[Notifications] Created:', notification.id, notification.title);
    return notification;
  }

  getActive(): Notification[] {
    const now = new Date();
    return this.notifications.filter((n) => {
      if (!n.active) return false;
      if (n.expiresAt && new Date(n.expiresAt) < now) {
        n.active = false;
        return false;
      }
      return true;
    });
  }

  deactivate(id: string): boolean {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.active = false;
      return true;
    }
    return false;
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }
}
