import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  microsoftAppId: z.string().min(1),
  microsoftAppPassword: z.string().min(1),
  azureAdTenantId: z.string().min(1),
  azureAdClientId: z.string().min(1),
  azureAdClientSecret: z.string().min(1),
  azureOpenAiEndpoint: z.string().url(),
  azureOpenAiDeployment: z.string().min(1),
  azureOpenAiEmbeddingDeployment: z.string().min(1),
  azureOpenAiApiKey: z.string().min(1),
  sharepointSiteUrl: z.string().url(),
  confidenceThreshold: z.coerce.number().min(0).max(1).default(0.7),
  topN: z.coerce.number().int().positive().default(5),
  port: z.coerce.number().int().positive().default(3978),
  nodeEnv: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  escalationWebhookUrl: z.string().url().optional(),
  logDir: z.string().default('./logs'),
});

const devConfigSchema = z.object({
  microsoftAppId: z.string().default(''),
  microsoftAppPassword: z.string().default(''),
  azureAdTenantId: z.string().default(''),
  azureAdClientId: z.string().default(''),
  azureAdClientSecret: z.string().default(''),
  azureOpenAiEndpoint: z.string().default(''),
  azureOpenAiDeployment: z.string().default('gpt-4'),
  azureOpenAiEmbeddingDeployment: z.string().default('text-embedding-ada-002'),
  azureOpenAiApiKey: z.string().default(''),
  sharepointSiteUrl: z.string().default(''),
  confidenceThreshold: z.coerce.number().min(0).max(1).default(0.7),
  topN: z.coerce.number().int().positive().default(5),
  port: z.coerce.number().int().positive().default(3978),
  nodeEnv: z.enum(['development', 'test']).default('development'),
  escalationWebhookUrl: z.string().optional(),
  logDir: z.string().default('./logs'),
});

export type AppConfig = z.infer<typeof configSchema>;

function loadConfig(): AppConfig {
  const env = {
    microsoftAppId: process.env.MICROSOFT_APP_ID,
    microsoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
    azureAdTenantId: process.env.AZURE_AD_TENANT_ID,
    azureAdClientId: process.env.AZURE_AD_CLIENT_ID,
    azureAdClientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    azureOpenAiEmbeddingDeployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    azureOpenAiApiKey: process.env.AZURE_OPENAI_API_KEY,
    sharepointSiteUrl: process.env.SHAREPOINT_SITE_URL,
    confidenceThreshold: process.env.CONFIDENCE_THRESHOLD,
    topN: process.env.TOP_N,
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    escalationWebhookUrl: process.env.ESCALATION_WEBHOOK_URL || undefined,
    logDir: process.env.LOG_DIR,
  };

  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const result = isDev ? devConfigSchema.safeParse(env) : configSchema.safeParse(env);

  if (!result.success) {
    const missing = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configuration validation failed:\n${missing.join('\n')}`);
  }

  return result.data as AppConfig;
}

export const config = loadConfig();
