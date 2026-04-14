import { CardFactory, Attachment } from 'botbuilder';

interface AnswerCardOptions {
  question: string;
  answer: string;
  sources: { title: string; source: string }[];
  needsEscalation: boolean;
}

export function createAnswerCard(options: AnswerCardOptions): Attachment {
  const body: Record<string, unknown>[] = [
    {
      type: 'TextBlock',
      text: options.answer,
      wrap: true,
      size: 'Default',
    },
  ];

  if (options.sources.length > 0) {
    body.push({
      type: 'TextBlock',
      text: '**Sources:**',
      wrap: true,
      spacing: 'Medium',
      separator: true,
    });

    for (const source of options.sources) {
      body.push({
        type: 'TextBlock',
        text: `- ${source.title} _(${source.source})_`,
        wrap: true,
        size: 'Small',
        color: 'Accent',
      });
    }
  }

  const actions: Record<string, unknown>[] = [];

  if (options.needsEscalation) {
    actions.push({
      type: 'Action.Submit',
      title: 'Create IT Support Ticket',
      data: { action: 'escalate', originalQuestion: options.question },
    });
  }

  actions.push(
    {
      type: 'Action.Submit',
      title: 'Helpful',
      data: { action: 'feedback', value: 'helpful', question: options.question },
    },
    {
      type: 'Action.Submit',
      title: 'Not Helpful',
      data: { action: 'feedback', value: 'not_helpful', question: options.question },
    },
  );

  return CardFactory.adaptiveCard({
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body,
    actions,
  });
}
