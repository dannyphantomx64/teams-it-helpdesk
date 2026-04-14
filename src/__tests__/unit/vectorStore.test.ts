import { VectorStore } from '../../knowledge/vectorStore';
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

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
  });

  it('starts empty', () => {
    expect(store.size()).toBe(0);
  });

  it('upserts and retrieves chunks', () => {
    const chunk = makeChunk('a', [1, 0, 0]);
    store.upsert([chunk]);
    expect(store.size()).toBe(1);
  });

  it('updates existing chunks on upsert', () => {
    const original = makeChunk('a', [1, 0, 0]);
    store.upsert([original]);

    const updated = { ...original, content: 'Updated content' };
    store.upsert([updated]);

    expect(store.size()).toBe(1);
    const results = store.search([1, 0, 0], 1);
    expect(results[0].chunk.content).toBe('Updated content');
  });

  it('returns results sorted by similarity', () => {
    store.upsert([
      makeChunk('exact', [1, 0, 0]),
      makeChunk('partial', [0.7, 0.7, 0]),
      makeChunk('unrelated', [0, 0, 1]),
    ]);

    const results = store.search([1, 0, 0], 3);
    expect(results[0].chunk.id).toBe('exact');
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  it('respects topN limit', () => {
    store.upsert([
      makeChunk('a', [1, 0, 0]),
      makeChunk('b', [0, 1, 0]),
      makeChunk('c', [0, 0, 1]),
    ]);

    const results = store.search([1, 0, 0], 2);
    expect(results).toHaveLength(2);
  });

  it('clears all chunks', () => {
    store.upsert([makeChunk('a', [1, 0, 0])]);
    store.clear();
    expect(store.size()).toBe(0);
  });
});
