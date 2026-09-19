# Scenario builder wireframes

The builder is a responsive, multi-section editor rather than a one-shot wizard.

```text
[Scenario title] [Draft vN] [Saving/Saved/Error] [Validate] [Publish]
+----------------------+---------------------------------------------+
| Sections             | Section header + validation summary         |
| 1 Premise/style      | fields / resource list / editor             |
| 2 Rules/boundaries   |                                             |
| 3 Locations          | hierarchy tree + table/graph fallback       |
| 4 Entities           | public/private tabs + knowledge preview     |
| 5 Relationships      | directional graph + accessible list          |
| 6 Story cards        | editor + backlinks + version history        |
| 7 Plot               | arcs/points graph + status/evidence          |
| 8 Start state        | playable entity + location                  |
| 9 Models/pacing      | safe overrides and limits                   |
| 10 Validate/preview  | linked errors/warnings + principal selector  |
+----------------------+---------------------------------------------+
```

Requirements: every server issue links to section/resource/field; autosave status is persistent and non-color-only; conflicts show local/server values and reload/copy/merge actions; published revisions are visibly read-only; public/private fields are visually and accessibly labeled; graph editors have list/table alternatives; destructive actions require confirmation.
