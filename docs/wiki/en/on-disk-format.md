# On-disk format

[Wiki home](../README.md) · Spec §1–2: [phase-0-memory-api.md](../../phase-0-memory-api.md)

```text
<projectRoot>/.dsh/memory/
├── index.md
├── domains/<domain>.md
└── decisions/YYYY-MM-<slug>.md
```

Entry ids: `mem-YYYYMMDD-<hex>`. Frontmatter schema: `oph-memory-schema: 1`.

Domain files use `<!-- oph-memory-entry -->` separators between blocks.
