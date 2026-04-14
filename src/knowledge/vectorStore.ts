import { DocumentChunk, SearchResult, IVectorStore } from './types';

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

export class InMemoryVectorStore implements IVectorStore {
  private chunks: DocumentChunk[] = [];

  async upsert(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      const idx = this.chunks.findIndex((c) => c.id === chunk.id);
      if (idx >= 0) {
        this.chunks[idx] = chunk;
      } else {
        this.chunks.push(chunk);
      }
    }
  }

  async search(queryEmbedding: number[], topN: number): Promise<SearchResult[]> {
    return this.chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  async size(): Promise<number> {
    return this.chunks.length;
  }

  clear(): void {
    this.chunks = [];
  }
}
