# Project-specific CodeGraph tool guidance

For this project only, prefer CodeGraph tools over direct code file reading whenever possible.

Use these tools for codebase navigation and analysis:

- `codegraph_search`: symbol search by name
- `codegraph_node`: one symbol's signature, location, source, callers, and callees
- `codegraph_files`: indexed file tree
- `codegraph_callers`: functions or methods that call a symbol
- `codegraph_callees`: functions or methods called by a symbol
- `codegraph_impact`: impact radius for changing a symbol
- `codegraph_explore`: source for several related symbols grouped by file
- `codegraph_status`: index health and pending sync status

Use CodeGraph tools before direct code file reads (`read`, `grep`, `rg`, etc.) unless direct file access is absolutely necessary, such as when editing exact text, inspecting non-code assets/configuration, or when CodeGraph lacks the needed information.
