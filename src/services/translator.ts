import OpenAI from 'openai';
import { config } from '../config/config';

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

export interface TranslationResult {
  detectedLanguage: string;
  translatedQuery: string;
}

export async function detectAndTranslate(text: string): Promise<TranslationResult> {
  if (!config.enableTranslation || !config.azureOpenAiApiKey) {
    return { detectedLanguage: 'en', translatedQuery: text };
  }

  const response = await getClient().chat.completions.create({
    model: config.azureOpenAiDeployment,
    messages: [
      {
        role: 'system',
        content:
          'Detect the language of the user message and translate it to English. ' +
          'Respond ONLY with JSON: {"language": "ISO 639-1 code", "translation": "English translation"}. ' +
          'If already English, return the original text as the translation with language "en".',
      },
      { role: 'user', content: text },
    ],
    temperature: 0,
    max_tokens: 256,
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content ?? '{}');
    return {
      detectedLanguage: result.language ?? 'en',
      translatedQuery: result.translation ?? text,
    };
  } catch {
    return { detectedLanguage: 'en', translatedQuery: text };
  }
}

export async function translateResponse(text: string, targetLanguage: string): Promise<string> {
  if (!config.enableTranslation || targetLanguage === 'en' || !config.azureOpenAiApiKey) {
    return text;
  }

  const response = await getClient().chat.completions.create({
    model: config.azureOpenAiDeployment,
    messages: [
      {
        role: 'system',
        content: `Translate the following text to ${targetLanguage}. Keep markdown formatting, [Source N] citations, and technical terms intact. Return ONLY the translation.`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0,
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content ?? text;
}
