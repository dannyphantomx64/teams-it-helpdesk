import express from 'express';
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationBotFrameworkAuthenticationOptions,
} from 'botbuilder';
import { config } from './config/config';
import { HelpDeskBot } from './bot/helpDeskBot';
import { VectorStore } from './knowledge/vectorStore';
import { Ingester } from './knowledge/ingester';
import { Retriever } from './services/retriever';
import { Responder } from './services/responder';
import { EscalationService } from './services/escalation';
import { QuestionLogger } from './services/questionLog';

async function main() {
  const vectorStore = new VectorStore();
  const ingester = new Ingester(vectorStore);
  const retriever = new Retriever(vectorStore);
  const responder = new Responder();
  const escalation = new EscalationService();
  const questionLogger = new QuestionLogger(config.logDir);

  // Load IT knowledge base on startup
  await ingester.ingestLocalDocuments('./knowledge-base');

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

  const bot = new HelpDeskBot(retriever, responder, escalation, questionLogger);

  const app = express();
  app.use(express.json());

  app.post('/api/messages', async (req, res) => {
    await adapter.process(req, res, (context) => bot.run(context));
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(config.port, () => {
    console.log(`IT Help Desk Bot running at http://localhost:${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
  });
}

main().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
