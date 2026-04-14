import OpenAI from 'openai';
import { config } from '../config/config';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: config.azureOpenAiApiKey,
      baseURL: `${config.azureOpenAiEndpoint}/openai/deployments/${config.azureOpenAiEmbeddingDeployment}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: { 'api-key': config.azureOpenAiApiKey },
    });
  }
  return client;
}

export async function embedText(text: string): Promise<number[]> {
  if (config.nodeEnv === 'development' && !config.azureOpenAiApiKey) {
    return fakeEmbed(text);
  }

  const response = await getClient().embeddings.create({
    model: config.azureOpenAiEmbeddingDeployment,
    input: text,
  });

  return response.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (config.nodeEnv === 'development' && !config.azureOpenAiApiKey) {
    return texts.map(fakeEmbed);
  }

  const response = await getClient().embeddings.create({
    model: config.azureOpenAiEmbeddingDeployment,
    input: texts,
  });

  return response.data.map((d) => d.embedding);
}

// Deterministic fake embeddings for local dev without Azure credentials
function fakeEmbed(text: string): number[] {
  const dim = 1536;
  const embedding = new Array(dim).fill(0);
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    embedding[i % dim] += lower.charCodeAt(i) / 1000;
  }
  const magnitude = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return embedding.map((v) => v / (magnitude || 1));
}
