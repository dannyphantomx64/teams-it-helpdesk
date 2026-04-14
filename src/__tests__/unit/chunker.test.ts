import { chunkText } from '../../knowledge/chunker';

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    const chunks = chunkText('This is a short sentence.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('This is a short sentence.');
  });

  it('splits long text into multiple chunks', () => {
    const longText = Array(200).fill('This is a test sentence with several words.').join(' ');
    const chunks = chunkText(longText);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('never produces empty chunks', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const chunks = chunkText(text);
    for (const chunk of chunks) {
      expect(chunk.trim().length).toBeGreaterThan(0);
    }
  });

  it('handles empty input', () => {
    const chunks = chunkText('');
    expect(chunks).toHaveLength(0);
  });

  it('preserves sentence boundaries', () => {
    const text = 'Sentence one ends here. Sentence two starts here. And a third one.';
    const chunks = chunkText(text);
    // Each chunk should end at a sentence boundary (period followed by space or end)
    for (const chunk of chunks) {
      expect(chunk).toMatch(/[.!?]$/);
    }
  });
});
