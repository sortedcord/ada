# Model Configuration

## Generative model

- Provider: `aditya-gupta`
- Model ID: `Codex Proxy/gpt-5.6-luna`
- API: OpenAI-compatible Responses API
- Base URL: `https://ai.adityagupta.dev/v1`
- Authentication: same server-side provider credential used for the embedding model
- Reasoning: supported
- Intended roles: architect, NPC cognition, resolver, narrator, memory curator, and story-card mutation
- Default context setting: read from the provider model catalog at runtime

The exact model ID was verified through the provider’s `/v1/models` endpoint using the configured credential.

Recommended configuration:

```dotenv
GENERATION_ENABLED=true
GENERATION_PROVIDER=aditya-gupta
GENERATION_BASE_URL=https://ai.adityagupta.dev/v1
GENERATION_MODEL=Codex Proxy/gpt-5.6-luna
GENERATION_API=openai-responses
```

## Embedding model configuration

### Verified model

- Provider: `aditya-gupta`
- HTTP base URL: `https://ai.adityagupta.dev/v1`
- Embeddings endpoint: `POST /embeddings`
- Requested model ID: `azure/text-embedding-ada-002`
- Returned model ID: `text-embedding-ada-002`
- Vector dimensions: `1536`
- Recommended distance metric: `cosine`
- Protocol: OpenAI-compatible embeddings HTTP API

## Verified request

```http
POST https://ai.adityagupta.dev/v1/embeddings
Authorization: Bearer <provider-api-key>
x-bf-vk: <provider-api-key>
Content-Type: application/json
```

```json
{
  "model": "azure/text-embedding-ada-002",
  "input": "direct curl connectivity test"
}
```

The request was verified successfully with a direct HTTP `curl` request. The response contained a 1536-dimensional embedding.

## Application configuration

Use environment variables or a secret manager. Do not commit API keys to this repository.

```dotenv
EMBEDDING_ENABLED=true
EMBEDDING_PROVIDER=aditya-gupta
EMBEDDING_BASE_URL=https://ai.adityagupta.dev/v1
EMBEDDING_MODEL=azure/text-embedding-ada-002
EMBEDDING_DIMENSIONS=1536
EMBEDDING_DISTANCE=cosine
EMBEDDING_BATCH_SIZE=64
```

## Required request headers

The server-side provider adapter must send:

- `Authorization: Bearer $EMBEDDING_API_KEY`
- `x-bf-vk: $EMBEDDING_API_KEY`
- `Content-Type: application/json`

The API key must only be available to the backend/worker processes. It must never be sent to the browser or committed to source control.

## Database implication

Configure the active pgvector embedding profile with:

```text
provider: aditya-gupta
model: azure/text-embedding-ada-002
dimensions: 1536
distance: cosine
```

Create the pgvector HNSW index for `vector(1536)` after the embedding profile is activated.
