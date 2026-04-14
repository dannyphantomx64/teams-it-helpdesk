import { CardFactory, Attachment } from 'botbuilder';

export function createEscalationCard(prefillQuestion?: string): Attachment {
  return CardFactory.adaptiveCard({
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: 'IT Support Ticket',
        weight: 'Bolder',
        size: 'Large',
      },
      {
        type: 'TextBlock',
        text: "I'll route this to our IT team. Please fill out the details below:",
        wrap: true,
      },
      {
        type: 'Input.Text',
        id: 'employeeName',
        label: 'Your Name',
        placeholder: 'e.g. Jane Smith',
        isRequired: true,
      },
      {
        type: 'Input.ChoiceSet',
        id: 'issueCategory',
        label: 'Issue Category',
        isRequired: true,
        choices: [
          { title: 'Password / Account Access', value: 'password' },
          { title: 'VPN / Remote Access', value: 'vpn' },
          { title: 'Email Issues', value: 'email' },
          { title: 'Software Install Request', value: 'software' },
          { title: 'Hardware / Laptop', value: 'hardware' },
          { title: 'Network / Wi-Fi', value: 'network' },
          { title: 'Printer', value: 'printer' },
          { title: 'MFA / Two-Factor Auth', value: 'mfa' },
          { title: 'Other', value: 'other' },
        ],
      },
      {
        type: 'Input.Text',
        id: 'description',
        label: 'Describe the Issue',
        placeholder: 'What are you experiencing?',
        isMultiline: true,
        isRequired: true,
        value: prefillQuestion ?? '',
      },
      {
        type: 'Input.ChoiceSet',
        id: 'urgency',
        label: 'Urgency',
        isRequired: true,
        choices: [
          { title: 'Low - Can wait a few days', value: 'low' },
          { title: 'Medium - Need help today', value: 'medium' },
          { title: 'High - Blocking my work', value: 'high' },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Submit Ticket',
        data: { action: 'submitTicket' },
      },
    ],
  });
}
