import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { v5 as uuidv5 } from 'uuid';
import { chunkText } from './chunker';
import { embedBatch } from './embeddings';
import { VectorStore } from './vectorStore';
import { RawDocument, DocumentChunk } from './types';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export class Ingester {
  constructor(private store: VectorStore) {}

  async ingestLocalDocuments(directory: string): Promise<number> {
    const absDir = path.resolve(directory);

    if (!fs.existsSync(absDir)) {
      console.log(`Knowledge base directory not found: ${absDir} — skipping ingestion`);
      return 0;
    }

    const files = await fg(['**/*.md', '**/*.txt'], { cwd: absDir, absolute: true });
    console.log(`Found ${files.length} document(s) in ${absDir}`);

    let totalChunks = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(absDir, file);
        const category = path.dirname(relativePath) === '.' ? 'general' : path.dirname(relativePath);
        const title = path.basename(file, path.extname(file)).replace(/[-_]/g, ' ');

        const doc: RawDocument = { title, content, source: relativePath, category };
        const chunks = await this.processDocument(doc);
        this.store.upsert(chunks);
        totalChunks += chunks.length;
        console.log(`  Indexed: ${relativePath} (${chunks.length} chunks)`);
      } catch (err) {
        console.error(`  Failed to index ${file}:`, err);
      }
    }

    console.log(`Ingestion complete: ${totalChunks} chunks from ${files.length} documents`);
    return totalChunks;
  }

  private async processDocument(doc: RawDocument): Promise<DocumentChunk[]> {
    const textChunks = chunkText(doc.content);
    const embeddings = await embedBatch(textChunks);

    return textChunks.map((text, i) => ({
      id: uuidv5(`${doc.source}:${i}`, UUID_NAMESPACE),
      content: text,
      source: doc.source,
      title: doc.title,
      category: doc.category,
      embedding: embeddings[i],
    }));
  }
}
