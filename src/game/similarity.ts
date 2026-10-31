/**
 * Computes cosine similarity between two numeric vectors.
 * Returns a value in [-1, 1], with 1 being identical orientation.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extracts character trigrams from text.
 */
export function getTrigrams(text: string): Map<string, number> {
  const clean = `  ${text.toLowerCase().trim().replace(/\s+/g, ' ')}  `;
  const counts = new Map<string, number>();

  for (let i = 0; i <= clean.length - 3; i++) {
    const tri = clean.slice(i, i + 3);
    counts.set(tri, (counts.get(tri) || 0) + 1);
  }
  return counts;
}

/**
 * Fallback character-trigram cosine similarity when embeddings are unavailable.
 */
export function trigramSimilarity(textA: string, textB: string): number {
  const normA = textA.toLowerCase().trim();
  const normB = textB.toLowerCase().trim();
  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const triA = getTrigrams(normA);
  const triB = getTrigrams(normB);

  let dot = 0;
  let lenA = 0;
  let lenB = 0;

  for (const count of triA.values()) {
    lenA += count * count;
  }
  for (const count of triB.values()) {
    lenB += count * count;
  }

  for (const [tri, countA] of triA.entries()) {
    const countB = triB.get(tri);
    if (countB) {
      dot += countA * countB;
    }
  }

  if (lenA === 0 || lenB === 0) return 0;
  return dot / (Math.sqrt(lenA) * Math.sqrt(lenB));
}

/**
 * Generates a deterministic pseudo-embedding vector of fixed dimension (64)
 * from text trigrams, for offline or fallback comparisons.
 */
export function pseudoEmbed(text: string, dimensions = 64): number[] {
  const clean = `  ${text.toLowerCase().trim()}  `;
  const vec = new Array(dimensions).fill(0);

  for (let i = 0; i <= clean.length - 3; i++) {
    const tri = clean.slice(i, i + 3);
    let hash = 0;
    for (let c = 0; c < tri.length; c++) {
      hash = (hash << 5) - hash + tri.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1;
  }

  // Normalize to unit vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) norm += vec[i] * vec[i];
  if (norm > 0) {
    const sqrtNorm = Math.sqrt(norm);
    for (let i = 0; i < dimensions; i++) vec[i] = Number((vec[i] / sqrtNorm).toFixed(5));
  }
  return vec;
}
