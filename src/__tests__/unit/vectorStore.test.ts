import { InMemoryVectorStore } from '../../knowledge/vectorStore';
import { DocumentChunk } from '../../knowledge/types';

function makeChunk(id: string, embedding: number[]): DocumentChunk {
  return {
    id,
    content: `Content for ${id}`,
    source: `${id}.md`,
    title: id,
    category: 'test',
    embedding,
  };
}

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  it('starts empty', async () => {
    expect(await store.size()).toBe(0);
  });

  it('upserts and retrieves chunks', async () => {
    const chunk = makeChunk('a', [1, 0, 0]);
    await store.upsert([chunk]);
    expect(await store.size()).toBe(1);
  });

  it('updates existing chunks on upsert', async () => {
    const original = makeChunk('a', [1, 0, 0]);
    await store.upsert([original]);

    const updated = { ...original, content: 'Updated content' };
    await store.upsert([updated]);

    expect(await store.size()).toBe(1);
    const results = await store.search([1, 0, 0], 1);
    expect(results[0].chunk.content).toBe('Updated content');
  });

  it('returns results sorted by similarity', async () => {
    await store.upsert([
      makeChunk('exact', [1, 0, 0]),
      makeChunk('partial', [0.7, 0.7, 0]),
      makeChunk('unrelated', [0, 0, 1]),
    ]);

    const results = await store.search([1, 0, 0], 3);
    expect(results[0].chunk.id).toBe('exact');
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  it('respects topN limit', async () => {
    await store.upsert([
      makeChunk('a', [1, 0, 0]),
      makeChunk('b', [0, 1, 0]),
      makeChunk('c', [0, 0, 1]),
    ]);

    const results = await store.search([1, 0, 0], 2);
    expect(results).toHaveLength(2);
  });

  it('clears all chunks', async () => {
    await store.upsert([makeChunk('a', [1, 0, 0])]);
    store.clear();
    expect(await store.size()).toBe(0);
  });
});
