import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import cron from 'node-cron';
import { v5 as uuidv5 } from 'uuid';
import { chunkText } from './chunker';
import { embedBatch } from './embeddings';
import { IVectorStore } from './types';
import { RawDocument, DocumentChunk } from './types';
import { getGraphClient } from '../services/graphClient';
import { config } from '../config/config';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export class Ingester {
  constructor(private store: IVectorStore) {}

  // --- Local file ingestion ---

  async ingestLocalDocuments(directory: string): Promise<number> {
    const absDir = path.resolve(directory);

    if (!fs.existsSync(absDir)) {
      console.log(`[Ingester] Knowledge base directory not found: ${absDir} — skipping`);
      return 0;
    }

    const files = await fg(['**/*.md', '**/*.txt'], { cwd: absDir, absolute: true });
    console.log(`[Ingester] Found ${files.length} local document(s) in ${absDir}`);

    let totalChunks = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(absDir, file);
        const category = path.dirname(relativePath) === '.' ? 'general' : path.dirname(relativePath);
        const title = path.basename(file, path.extname(file)).replace(/[-_]/g, ' ');

        const doc: RawDocument = { title, content, source: relativePath, category };
        const chunks = await this.processDocument(doc);
        await this.store.upsert(chunks);
        totalChunks += chunks.length;
        console.log(`  Indexed: ${relativePath} (${chunks.length} chunks)`);
      } catch (err) {
        console.error(`  Failed to index ${file}:`, err);
      }
    }

    console.log(`[Ingester] Local ingestion complete: ${totalChunks} chunks from ${files.length} documents`);
    return totalChunks;
  }

  // --- SharePoint ingestion ---

  async ingestFromSharePoint(): Promise<number> {
    if (!config.sharepointSiteUrl || !config.azureAdClientId) {
      console.log('[Ingester] SharePoint not configured — skipping');
      return 0;
    }

    try {
      const graphClient = getGraphClient();
      const siteUrl = new URL(config.sharepointSiteUrl);
      const sitePath = siteUrl.pathname;

      // Resolve site ID
      const site = await graphClient
        .api(`/sites/${siteUrl.hostname}:${sitePath}`)
        .get();

      // Get the document library (default or specified drive)
      const driveId = config.sharepointDriveId;
      const driveEndpoint = driveId
        ? `/sites/${site.id}/drives/${driveId}`
        : `/sites/${site.id}/drive`;

      // List all files in the root
      const items = await graphClient
        .api(`${driveEndpoint}/root/children`)
        .select('id,name,file,size,lastModifiedDateTime')
        .get();

      let totalChunks = 0;
      const supportedExtensions = ['.md', '.txt', '.pdf'];

      for (const item of items.value ?? []) {
        if (!item.file) continue;
        const ext = path.extname(item.name).toLowerCase();
        if (!supportedExtensions.includes(ext)) continue;

        try {
          // Download file content
          const stream = await graphClient
            .api(`${driveEndpoint}/items/${item.id}/content`)
            .getStream();

          const buffers: Buffer[] = [];
          for await (const chunk of stream) {
            buffers.push(Buffer.from(chunk));
          }
          const buffer = Buffer.concat(buffers);

          let content: string;
          if (ext === '.pdf') {
            const pdfParse = (await import('pdf-parse')).default;
            const pdf = await pdfParse(buffer);
            content = pdf.text;
          } else {
            content = buffer.toString('utf-8');
          }

          const doc: RawDocument = {
            title: path.basename(item.name, ext).replace(/[-_]/g, ' '),
            content,
            source: `sharepoint/${item.name}`,
            category: 'sharepoint',
          };

          const chunks = await this.processDocument(doc);
          await this.store.upsert(chunks);
          totalChunks += chunks.length;
          console.log(`  Indexed (SharePoint): ${item.name} (${chunks.length} chunks)`);
        } catch (err) {
          console.error(`  Failed to index SharePoint file ${item.name}:`, err);
        }
      }

      console.log(`[Ingester] SharePoint ingestion complete: ${totalChunks} chunks`);
      return totalChunks;
    } catch (err) {
      console.error('[Ingester] SharePoint ingestion failed:', err);
      return 0;
    }
  }

  // --- Scheduled re-indexing ---

  startScheduledIngestion(intervalMinutes: number, localDir: string): void {
    const cronExpression = `*/${intervalMinutes} * * * *`;

    cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] Re-indexing started at ${new Date().toISOString()}`);
      await this.ingestLocalDocuments(localDir);
      await this.ingestFromSharePoint();
      console.log(`[Scheduler] Re-indexing complete`);
    });

    console.log(`[Scheduler] Document re-indexing scheduled every ${intervalMinutes} minutes`);
  }

  // --- Document processing ---

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
