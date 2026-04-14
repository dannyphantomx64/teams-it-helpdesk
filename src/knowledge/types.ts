export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  title: string;
  category: string;
  embedding: number[];
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export interface RawDocument {
  title: string;
  content: string;
  source: string;
  category: string;
}
