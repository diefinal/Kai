export interface IEmbeddingProvider {
  readonly dimensions: number;
  generateEmbedding(text: string): Promise<number[]>;
  computeCosineSimilarity(vecA: number[], vecB: number[]): number;
}

/**
 * Deterministic hash and n-gram based unit-normalized embedding provider.
 * Allows semantic search & vector ranking without external heavy dependencies,
 * fully ready for pluggable OpenAI / local embedding models.
 */
export class StubEmbeddingProvider implements IEmbeddingProvider {
  readonly dimensions: number;

  constructor(dimensions = 64) {
    this.dimensions = dimensions;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const vec = new Array(this.dimensions).fill(0);
    const normalized = text.toLowerCase().trim();
    if (!normalized) return vec;

    const words = normalized.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = this.hashString(word);
      const index = Math.abs(hash) % this.dimensions;
      vec[index] += 1.0;

      // Character tri-grams for subword semantic similarity
      for (let j = 0; j < word.length - 2; j++) {
        const tri = word.substring(j, j + 3);
        const triHash = this.hashString(tri);
        const triIdx = Math.abs(triHash) % this.dimensions;
        vec[triIdx] += 0.5;
      }
    }

    return this.normalize(vec);
  }

  computeCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
      return 0;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash;
  }

  private normalize(vec: number[]): number[] {
    let sumSq = 0;
    for (const v of vec) {
      sumSq += v * v;
    }
    const norm = Math.sqrt(sumSq);
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
  }
}
