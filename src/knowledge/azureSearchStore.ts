import {
  SearchClient,
  AzureKeyCredential,
  KnownQueryType,
} from '@azure/search-documents';
import { DocumentChunk, SearchResult, IVectorStore } from './types';

interface SearchDoc {
  id: string;
  content: string;
  source: string;
  title: string;
  category: string;
  embedding: number[];
}

export class AzureSearchStore implements IVectorStore {
  private client: SearchClient<SearchDoc>;

  constructor(connectionString: string) {
    const { endpoint, apiKey, indexName } = this.parseConnectionString(connectionString);
    this.client = new SearchClient<SearchDoc>(
      endpoint,
      indexName,
      new AzureKeyCredential(apiKey),
    );
  }

  private parseConnectionString(cs: string): { endpoint: string; apiKey: string; indexName: string } {
    const parts = new Map(
      cs.split(';').map((p) => {
        const [key, ...rest] = p.split('=');
        return [key.trim(), rest.join('=')] as [string, string];
      }),
    );
    return {
      endpoint: parts.get('Endpoint') ?? '',
      apiKey: parts.get('ApiKey') ?? '',
      indexName: parts.get('Index') ?? 'it-helpdesk-index',
    };
  }

  async upsert(chunks: DocumentChunk[]): Promise<void> {
    const docs: SearchDoc[] = chunks.map((c) => ({
      id: c.id,
      content: c.content,
      source: c.source,
      title: c.title,
      category: c.category,
      embedding: c.embedding,
    }));

    for (let i = 0; i < docs.length; i += 100) {
      await this.client.mergeOrUploadDocuments(docs.slice(i, i + 100));
    }
  }

  async search(queryEmbedding: number[], topN: number): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    const response = await this.client.search('*', {
      top: topN,
      vectorSearchOptions: {
        queries: [
          {
            kind: 'vector',
            vector: queryEmbedding,
            kNearestNeighborsCount: topN,
            fields: ['embedding'],
          },
        ],
      },
      queryType: KnownQueryType.Semantic,
      semanticSearchOptions: {
        configurationName: 'default',
      },
    });

    for await (const result of response.results) {
      const doc = result.document;
      results.push({
        chunk: {
          id: doc.id,
          content: doc.content,
          source: doc.source,
          title: doc.title,
          category: doc.category,
          embedding: doc.embedding,
        },
        score: result.score ?? 0,
      });
    }

    return results;
  }

  async size(): Promise<number> {
    return this.client.getDocumentsCount();
  }
}
