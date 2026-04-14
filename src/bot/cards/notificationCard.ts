import { CardFactory, Attachment } from 'botbuilder';
import { Notification } from '../../services/notifications';

export function createNotificationCard(notification: Notification): Attachment {
  const severityColor: Record<string, string> = {
    info: 'Accent',
    warning: 'Warning',
    critical: 'Attention',
  };

  const severityLabel: Record<string, string> = {
    info: 'INFO',
    warning: 'WARNING',
    critical: 'OUTAGE',
  };

  return CardFactory.adaptiveCard({
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: `[${severityLabel[notification.severity] ?? 'NOTICE'}] ${notification.title}`,
        weight: 'Bolder',
        color: severityColor[notification.severity] ?? 'Default',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: notification.message,
        wrap: true,
        spacing: 'Small',
      },
    ],
  });
}
