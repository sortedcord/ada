# Settings and debug wireframes

```text
Settings
├─ Provider/models: configured status, catalog age, refresh, test
├─ Role assignments: architect / NPC / resolver / narrator / memory / mutation / critic
├─ Retrieval: lexical weights, budgets, caps, warning
├─ Embeddings: disabled/configured, profile, dimensions, test, reindex progress
├─ Operations: health, queue, backup status, telemetry retention
└─ Local inspectors (marked): truth/state, memories, beliefs, thoughts, retrieval trace
```

Secrets are written through server configuration and never echoed into browser state. Debug inspectors are hidden/forbidden outside allowed development/admin contexts, show prominent privacy warnings, and display IDs/metadata before optional private text.
