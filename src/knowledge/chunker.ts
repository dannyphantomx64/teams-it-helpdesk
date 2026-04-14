const MAX_CHUNK_TOKENS = 512;
const OVERLAP_TOKENS = 50;

function estimateTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

export function chunkText(text: string): string[] {
  const sentences = splitSentences(text);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (sentenceTokens > MAX_CHUNK_TOKENS) {
      if (current.length > 0) {
        chunks.push(current.join(' '));
        current = [];
        currentTokens = 0;
      }
      chunks.push(sentence);
      continue;
    }

    if (currentTokens + sentenceTokens > MAX_CHUNK_TOKENS) {
      chunks.push(current.join(' '));

      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const t = estimateTokens(current[i]);
        if (overlapTokens + t > OVERLAP_TOKENS) break;
        overlapSentences.unshift(current[i]);
        overlapTokens += t;
      }

      current = [...overlapSentences, sentence];
      currentTokens = overlapTokens + sentenceTokens;
    } else {
      current.push(sentence);
      currentTokens += sentenceTokens;
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(' '));
  }

  return chunks;
}
