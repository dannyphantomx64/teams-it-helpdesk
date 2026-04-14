import { config } from '../config/config';
import { embedText } from '../knowledge/embeddings';
import { VectorStore } from '../knowledge/vectorStore';
import { SearchResult } from '../knowledge/types';

export class Retriever {
  constructor(private store: VectorStore) {}

  async retrieve(query: string): Promise<{ results: SearchResult[]; confident: boolean }> {
    const queryEmbedding = await embedText(query);
    const results = this.store.search(queryEmbedding, config.topN);

    const topScore = results.length > 0 ? results[0].score : 0;
    const confident = topScore >= config.confidenceThreshold;

    return { results: confident ? results : [], confident };
  }
}
