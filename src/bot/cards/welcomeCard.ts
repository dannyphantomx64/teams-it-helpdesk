import { CardFactory, Attachment } from 'botbuilder';

export function createWelcomeCard(): Attachment {
  return CardFactory.adaptiveCard({
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: 'IT Help Desk Bot',
        weight: 'Bolder',
        size: 'Large',
      },
      {
        type: 'TextBlock',
        text: "Hi! I'm your IT Help Desk assistant. I can help you with common IT issues using our approved company documentation.",
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: '**I can help with:**',
        wrap: true,
        spacing: 'Medium',
      },
      {
        type: 'TextBlock',
        text: [
          '- Password resets & account access',
          '- VPN setup & troubleshooting',
          '- MFA / two-factor authentication',
          '- Wi-Fi & network issues',
          '- Printer problems',
          '- Software install requests',
          '- Laptop setup',
          '- Email troubleshooting',
        ].join('\n'),
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: "Just type your question and I'll search our IT knowledge base. If I can't help, I'll connect you with the IT team.",
        wrap: true,
        spacing: 'Medium',
        isSubtle: true,
      },
    ],
  });
}
