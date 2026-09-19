import type postgres from 'postgres';

const profilePattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

function validateProfile(profileId: string): void {
  if (!profilePattern.test(profileId)) throw new Error('Invalid embedding profile identifier');
}
function validateDimensions(dimensions: number): void {
  if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 16_000)
    throw new Error('Embedding dimensions are outside supported bounds');
}

export async function createEmbeddingHnswIndex(
  client: ReturnType<typeof postgres>,
  profileId: string,
  dimensions: number,
): Promise<string> {
  validateProfile(profileId);
  validateDimensions(dimensions);
  const indexName = `chunk_embeddings_${profileId}_hnsw`;
  await client.unsafe(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${indexName}" ON "chunk_embeddings" USING hnsw (("embedding"::vector(${dimensions})) vector_cosine_ops) WHERE "embedding_profile_id" = '${profileId}'`,
  );
  return indexName;
}

export async function dropEmbeddingHnswIndex(
  client: ReturnType<typeof postgres>,
  profileId: string,
): Promise<void> {
  validateProfile(profileId);
  await client.unsafe(`DROP INDEX CONCURRENTLY IF EXISTS "chunk_embeddings_${profileId}_hnsw"`);
}
