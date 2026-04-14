import { TeamsActivityHandler, TurnContext } from 'botbuilder';
import { Retriever } from '../services/retriever';
import { Responder } from '../services/responder';
import { EscalationService, EscalationTicket } from '../services/escalation';
import { QuestionLogger } from '../services/questionLog';
import { createAnswerCard } from './cards/answerCard';
import { createEscalationCard } from './cards/escalationCard';
import { createWelcomeCard } from './cards/welcomeCard';

export class HelpDeskBot extends TeamsActivityHandler {
  constructor(
    private retriever: Retriever,
    private responder: Responder,
    private escalation: EscalationService,
    private questionLogger: QuestionLogger,
  ) {
    super();

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded ?? []) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity({ attachments: [createWelcomeCard()] });
        }
      }
      await next();
    });

    this.onMessage(async (context, next) => {
      if (context.activity.value) {
        await this.handleCardAction(context);
        await next();
        return;
      }

      const query = context.activity.text?.trim();
      if (!query) {
        await next();
        return;
      }

      await context.sendActivity({ type: 'typing' });

      try {
        const { results, confident } = await this.retriever.retrieve(query);

        if (!confident) {
          this.questionLogger.log({
            timestamp: new Date().toISOString(),
            userId: context.activity.from.id,
            question: query,
            answered: false,
            escalated: false,
            topScore: 0,
          });

          const card = createAnswerCard({
            question: query,
            answer:
              "I couldn't find a verified answer for that in our IT documentation. I'd recommend reaching out to the IT team directly, or I can create a support ticket for you.",
            sources: [],
            needsEscalation: true,
          });

          await context.sendActivity({ attachments: [card] });
          await next();
          return;
        }

        const response = await this.responder.generateAnswer(query, results);

        this.questionLogger.log({
          timestamp: new Date().toISOString(),
          userId: context.activity.from.id,
          question: query,
          answered: !response.needsEscalation,
          escalated: false,
          topScore: results[0]?.score ?? 0,
        });

        const card = createAnswerCard({
          question: query,
          answer: response.answer,
          sources: response.sources,
          needsEscalation: response.needsEscalation,
        });

        await context.sendActivity({ attachments: [card] });
      } catch (err) {
        console.error('[HelpDeskBot] Error processing message:', err);
        await context.sendActivity(
          'I ran into an issue processing your question. Please try again or contact IT support at ext. 4357.',
        );
      }

      await next();
    });
  }

  private async handleCardAction(context: TurnContext): Promise<void> {
    const data = context.activity.value;

    switch (data.action) {
      case 'escalate':
        await context.sendActivity({
          attachments: [createEscalationCard(data.originalQuestion)],
        });
        break;

      case 'submitTicket': {
        const ticket: EscalationTicket = {
          employeeName: data.employeeName,
          issueCategory: data.issueCategory,
          description: data.description,
          urgency: data.urgency,
          timestamp: new Date().toISOString(),
        };

        const result = await this.escalation.createTicket(ticket);

        this.questionLogger.log({
          timestamp: new Date().toISOString(),
          userId: context.activity.from.id,
          question: data.description,
          answered: false,
          escalated: true,
          topScore: 0,
        });

        await context.sendActivity(result.message);
        break;
      }

      case 'feedback':
        console.log(`[Feedback] ${data.value} for: "${data.question}"`);
        await context.sendActivity(
          data.value === 'helpful'
            ? 'Thanks for the feedback! Glad I could help.'
            : "Thanks for letting me know. I'll flag this for the IT team to improve.",
        );
        break;

      default:
        break;
    }
  }
}
