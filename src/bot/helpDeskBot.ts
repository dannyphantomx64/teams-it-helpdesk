import { TeamsActivityHandler, TurnContext } from 'botbuilder';
import { Retriever } from '../services/retriever';
import { Responder } from '../services/responder';
import { EscalationService, EscalationTicket } from '../services/escalation';
import { QuestionLogger } from '../services/questionLog';
import { ConversationMemory } from '../services/conversationMemory';
import { NotificationService } from '../services/notifications';
import { detectAndTranslate, translateResponse } from '../services/translator';
import { createAnswerCard } from './cards/answerCard';
import { createEscalationCard } from './cards/escalationCard';
import { createWelcomeCard } from './cards/welcomeCard';
import { createNotificationCard } from './cards/notificationCard';

export class HelpDeskBot extends TeamsActivityHandler {
  constructor(
    private retriever: Retriever,
    private responder: Responder,
    private escalation: EscalationService,
    private questionLogger: QuestionLogger,
    private conversationMemory: ConversationMemory,
    private notificationService: NotificationService,
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

      // Show active outage/maintenance notifications
      const activeNotifications = this.notificationService.getActive();
      for (const notif of activeNotifications) {
        await context.sendActivity({ attachments: [createNotificationCard(notif)] });
      }

      try {
        const conversationId = context.activity.conversation.id;

        // Multi-language: detect language and translate to English for retrieval
        const { detectedLanguage, translatedQuery } = await detectAndTranslate(query);

        // Get conversation history for multi-turn context
        const history = this.conversationMemory.getHistory(conversationId);

        const { results, confident } = await this.retriever.retrieve(translatedQuery);

        if (!confident) {
          this.questionLogger.log({
            timestamp: new Date().toISOString(),
            userId: context.activity.from.id,
            question: query,
            answered: false,
            escalated: false,
            topScore: 0,
          });

          let fallbackMessage =
            "I couldn't find a verified answer for that in our IT documentation. I'd recommend reaching out to the IT team directly, or I can create a support ticket for you.";

          fallbackMessage = await translateResponse(fallbackMessage, detectedLanguage);

          const card = createAnswerCard({
            question: query,
            answer: fallbackMessage,
            sources: [],
            needsEscalation: true,
          });

          this.conversationMemory.addMessage(conversationId, 'user', query);
          this.conversationMemory.addMessage(conversationId, 'assistant', fallbackMessage);

          await context.sendActivity({ attachments: [card] });
          await next();
          return;
        }

        const response = await this.responder.generateAnswer(translatedQuery, results, history);

        // Translate response back to user's language
        const translatedAnswer = await translateResponse(response.answer, detectedLanguage);

        this.questionLogger.log({
          timestamp: new Date().toISOString(),
          userId: context.activity.from.id,
          question: query,
          answered: !response.needsEscalation,
          escalated: false,
          topScore: results[0]?.score ?? 0,
        });

        // Store in conversation memory
        this.conversationMemory.addMessage(conversationId, 'user', query);
        this.conversationMemory.addMessage(conversationId, 'assistant', translatedAnswer);

        const card = createAnswerCard({
          question: query,
          answer: translatedAnswer,
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
