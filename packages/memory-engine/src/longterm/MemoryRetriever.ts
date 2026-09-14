import { IEmbeddingProvider } from './EmbeddingProvider';
import { IMemoryStore, MemorySearchOptions, MemorySearchResult } from './MemoryTypes';

export class MemoryRetriever {
  constructor(
    private readonly store: IMemoryStore,
    private readonly embeddingProvider: IEmbeddingProvider
  ) {}

  async retrieve(
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult[]> {
    const limit = options.limit || 10;
    const queryLower = query.toLowerCase().trim();

    // 1. Keyword search
    const keywordMatches = await this.store.searchKeywords(query, options, limit * 2);

    // 2. Semantic vector search
    const allRecords = await this.store.find(options, 200, 0);
    const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);

    const scoredMap = new Map<string, MemorySearchResult>();

    // Score keyword matches
    for (const record of keywordMatches) {
      let score = 0.5;
      if (record.title.toLowerCase().includes(queryLower)) score += 0.3;
      if (record.content.toLowerCase().includes(queryLower)) score += 0.2;
      score += Math.min(record.importance * 0.1, 0.2);

      scoredMap.set(record.id, {
        record,
        score: Math.min(score, 1.0),
        matchedBy: record.title.toLowerCase() === queryLower ? 'exact' : 'keyword',
      });
    }

    // Score semantic embedding matches
    for (const record of allRecords) {
      if (!record.embedding) continue;
      const sim = this.embeddingProvider.computeCosineSimilarity(queryEmbedding, record.embedding);

      if (options.minSimilarity && sim < options.minSimilarity) {
        continue;
      }

      if (sim > 0.1) {
        const existing = scoredMap.get(record.id);
        const semanticScore = sim * 0.8 + Math.min(record.importance * 0.1, 0.2);

        if (existing) {
          existing.score = Math.max(existing.score, semanticScore);
          existing.matchedBy = 'semantic';
        } else {
          scoredMap.set(record.id, {
            record,
            score: semanticScore,
            matchedBy: 'semantic',
          });
        }
      }
    }

    const results = Array.from(scoredMap.values());

    // Sort results
    if (options.sortBy === 'recency') {
      results.sort((a, b) => b.record.updatedAt.getTime() - a.record.updatedAt.getTime());
    } else if (options.sortBy === 'importance') {
      results.sort((a, b) => b.record.importance - a.record.importance);
    } else {
      // relevance (default)
      results.sort((a, b) => b.score - a.score);
    }

    return results.slice(0, limit);
  }

  async findSimilar(
    embeddingOrText: number[] | string,
    limit = 10,
    category?: string
  ): Promise<MemorySearchResult[]> {
    const targetEmbedding =
      typeof embeddingOrText === 'string'
        ? await this.embeddingProvider.generateEmbedding(embeddingOrText)
        : embeddingOrText;

    const allRecords = await this.store.find(category ? { category } : undefined, 300, 0);
    const results: MemorySearchResult[] = [];

    for (const record of allRecords) {
      if (!record.embedding) continue;
      const similarity = this.embeddingProvider.computeCosineSimilarity(
        targetEmbedding,
        record.embedding
      );
      if (similarity > 0) {
        results.push({
          record,
          score: similarity,
          matchedBy: 'semantic',
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}
