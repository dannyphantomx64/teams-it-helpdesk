import { config } from '../config/config';
import { IVectorStore } from './types';
import { InMemoryVectorStore } from './vectorStore';
import { AzureSearchStore } from './azureSearchStore';

export function createVectorStore(): IVectorStore {
  if (config.nodeEnv === 'production' && config.knowledgeBaseConnectionString) {
    console.log('[VectorStore] Using Azure AI Search (hybrid vector + BM25 with semantic reranking)');
    return new AzureSearchStore(config.knowledgeBaseConnectionString);
  }

  console.log('[VectorStore] Using in-memory cosine similarity (development mode)');
  return new InMemoryVectorStore();
}
