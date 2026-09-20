# Scenario Authoring MCP Bridge

This is a local stdio MCP-compatible bridge for the scenario builder authoring API.

It exposes read/propose/apply tools while keeping canonical mutation behind the proposal workflow:

- `scenario_get`
- `scenario_validate`
- `scenario_propose`
- `scenario_chat`
- `scenario_continuity_review`
- `scenario_list_proposals`
- `scenario_apply_proposal`

The bridge talks to the API rather than directly to PostgreSQL. This keeps authentication, optimistic concurrency, validation, audit logging, and published-revision immutability in one place.

## Run

```bash
SCENARIO_API_URL=http://127.0.0.1:3000/api/v1 pnpm scenario:mcp
```

The process communicates over newline-delimited JSON-RPC on stdin/stdout. Configure it as a local MCP server in the client of your choice.

The intended permission model is read + propose by default. Applying a proposal should be explicitly enabled for trusted local clients.
