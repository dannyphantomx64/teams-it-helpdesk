import OpenAI from 'openai';
import { config } from '../config/config';
import { SearchResult } from '../knowledge/types';

const SYSTEM_PROMPT = `You are an IT Help Desk assistant for a company. Your job is to help employees resolve common IT issues using ONLY the provided documentation.

Rules:
- ONLY answer based on the provided source documents below
- If the documents do not contain enough information, say: "I couldn't find a verified answer for that in our IT documentation. Let me connect you with the IT team."
- Keep responses short, clear, and employee-friendly
- Use numbered steps for procedures
- Include [Source N] citations when referencing specific documents
- Never guess, speculate, or make up information
- For security-sensitive topics (passwords, access), always recommend official IT channels`;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: config.azureOpenAiApiKey,
      baseURL: `${config.azureOpenAiEndpoint}/openai/deployments/${config.azureOpenAiDeployment}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: { 'api-key': config.azureOpenAiApiKey },
    });
  }
  return client;
}

export interface BotResponse {
  answer: string;
  sources: { title: string; source: string }[];
  needsEscalation: boolean;
}

export class Responder {
  async generateAnswer(query: string, results: SearchResult[]): Promise<BotResponse> {
    // In dev mode without Azure credentials, return content directly from knowledge base
    if (config.nodeEnv === 'development' && !config.azureOpenAiApiKey) {
      return this.devModeResponse(query, results);
    }

    const sourceDocs = results.map(
      (r, i) => `[Source ${i + 1}] (${r.chunk.title})\n${r.chunk.content}`
    );

    const userMessage = `Documentation:\n${sourceDocs.join('\n\n---\n\n')}\n\nEmployee question: ${query}`;

    const response = await getClient().chat.completions.create({
      model: config.azureOpenAiDeployment,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0,
      max_tokens: 1024,
    });

    const answer = response.choices[0]?.message?.content ?? 'I was unable to generate a response.';
    const needsEscalation =
      answer.includes('connect you with the IT team') || answer.includes("couldn't find");

    const sources = results.map((r) => ({
      title: r.chunk.title,
      source: r.chunk.source,
    }));

    return { answer, sources, needsEscalation };
  }

  private devModeResponse(query: string, results: SearchResult[]): BotResponse {
    if (results.length === 0) {
      return {
        answer:
          "I couldn't find a verified answer for that in our IT documentation. Let me connect you with the IT team.",
        sources: [],
        needsEscalation: true,
      };
    }

    const sources = results.map((r) => ({ title: r.chunk.title, source: r.chunk.source }));
    const answer = `Based on our IT documentation [Source 1]:\n\n${results[0].chunk.content}`;
    return { answer, sources, needsEscalation: false };
  }
}
