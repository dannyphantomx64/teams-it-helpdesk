import express from 'express';
import path from 'path';
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationBotFrameworkAuthenticationOptions,
} from 'botbuilder';
import { config } from './config/config';
import { HelpDeskBot } from './bot/helpDeskBot';
import { createVectorStore } from './knowledge/vectorStoreFactory';
import { Ingester } from './knowledge/ingester';
import { Retriever } from './services/retriever';
import { Responder } from './services/responder';
import { EscalationService } from './services/escalation';
import { QuestionLogger } from './services/questionLog';
import { ConversationMemory } from './services/conversationMemory';
import { NotificationService } from './services/notifications';
import { AnalyticsService } from './services/analytics';

async function main() {
  // --- Initialize services ---
  const vectorStore = createVectorStore();
  const ingester = new Ingester(vectorStore);
  const retriever = new Retriever(vectorStore);
  const responder = new Responder();
  const escalation = new EscalationService();
  const questionLogger = new QuestionLogger(config.logDir);
  const conversationMemory = new ConversationMemory(config.maxConversationTurns);
  const notificationService = new NotificationService();
  const analyticsService = new AnalyticsService(questionLogger);

  // --- Ingest knowledge base ---
  await ingester.ingestLocalDocuments('./knowledge-base');
  await ingester.ingestFromSharePoint();

  // --- Scheduled re-indexing ---
  ingester.startScheduledIngestion(config.indexIntervalMinutes, './knowledge-base');

  // --- Periodic conversation memory cleanup ---
  setInterval(() => conversationMemory.cleanup(), 10 * 60 * 1000);

  // --- Bot Framework setup ---
  const botFrameworkAuth = new ConfigurationBotFrameworkAuthentication(
    {} as ConfigurationBotFrameworkAuthenticationOptions,
    {
      MicrosoftAppId: config.microsoftAppId,
      MicrosoftAppPassword: config.microsoftAppPassword,
      MicrosoftAppType: 'SingleTenant',
      MicrosoftAppTenantId: config.azureAdTenantId,
    },
  );

  const adapter = new CloudAdapter(botFrameworkAuth);

  adapter.onTurnError = async (context, error) => {
    console.error('[Bot Error]', error);
    await context.sendActivity(
      'Sorry, something went wrong. Please try again or contact IT support at ext. 4357.',
    );
  };

  const bot = new HelpDeskBot(
    retriever,
    responder,
    escalation,
    questionLogger,
    conversationMemory,
    notificationService,
  );

  // --- Express server ---
  const app = express();
  app.use(express.json());

  // Bot Framework messages endpoint
  app.post('/api/messages', async (req, res) => {
    await adapter.process(req, res, (context) => bot.run(context));
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      knowledgeBaseSize: vectorStore.size(),
      activeConversations: conversationMemory.activeConversationCount(),
      activeNotifications: notificationService.getActive().length,
    });
  });

  // --- Analytics API ---
  app.get('/api/analytics', (_req, res) => {
    const days = parseInt((_req.query as Record<string, string>).days ?? '30', 10);
    res.json(analyticsService.getSummary(days));
  });

  // --- Notifications API ---
  app.get('/api/notifications', (_req, res) => {
    res.json(notificationService.getAll());
  });

  app.post('/api/notifications', (req, res) => {
    const { title, message, severity, expiresAt } = req.body;
    if (!title || !message || !severity) {
      res.status(400).json({ error: 'title, message, and severity are required' });
      return;
    }
    const notification = notificationService.create({ title, message, severity, expiresAt });
    res.status(201).json(notification);
  });

  app.delete('/api/notifications/:id', (req, res) => {
    const success = notificationService.deactivate(req.params.id);
    if (success) {
      res.json({ status: 'deactivated' });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  });

  // --- Analytics Dashboard ---
  app.get('/dashboard', (_req, res) => {
    res.sendFile(path.resolve('public/dashboard.html'));
  });

  // --- Start server ---
  app.listen(config.port, () => {
    console.log(`IT Help Desk Bot running at http://localhost:${config.port}`);
    console.log(`Health check:         http://localhost:${config.port}/health`);
    console.log(`Analytics dashboard:  http://localhost:${config.port}/dashboard`);
    console.log(`Analytics API:        http://localhost:${config.port}/api/analytics`);
    console.log(`Notifications API:    http://localhost:${config.port}/api/notifications`);
  });
}

main().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
