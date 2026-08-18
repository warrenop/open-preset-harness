# Contributing to open-preset-harness

感谢参与！We welcome contributions in **English and 中文**.

---

## Ways to contribute (no code required)

| Type | How |
|------|-----|
| **Scenario** | Add a row to [docs/scenarios.md](docs/scenarios.md) |
| **Issue** | Bug, UX friction, "I tried X and it failed" — tag `[cn-scenario]` or `[en-scenario]` |
| **Doc** | README, [phase-0-memory-api.md](docs/phase-0-memory-api.md), CN/EN parity |
| **Code** | Memory plugin, CLI, tests (Phase 0+) |

**Scenario PRs are first-class.** They help us test market fit across domains.

---

## Scenario template

Add to `docs/scenarios.md`:

```markdown
### <Short title>

- **Industry / context:** …
- **Writer preset (example):** …
- **Reader preset (example):** …
- **Memory domain(s):** e.g. `security`, `api`, `client`
- **Without shared memory:** …
- **With shared memory:** …
- **Optional:** sensitivity (PII, compliance), git vs local-only
```

---

## API and spec changes

Phase 0 contracts live in [docs/phase-0-memory-api.md](docs/phase-0-memory-api.md).

Before changing tool names, parameters, or frontmatter fields:

1. Open an Issue describing the breaking change and migration
2. Update the spec doc in the same PR as code
3. Bump the `oph-memory-schema` version in frontmatter if the on-disk format changes

---

## Development (when code exists)

1. Fork → branch → PR
2. Match Harness conventions: Cordis plugins, ESM, **model-visible ⟺ logged**
3. Memory writes go through `remember` or approved hooks — do not bypass the session log
4. Run tests documented in the PR
5. Update README if user-visible behavior changes

---

## Code of conduct

Be respectful. No harassment. Critique ideas, not people.

---

## License

By contributing, you agree your contributions are licensed under MIT,
consistent with this project and DeepSeek Harness upstream notices in [NOTICE](NOTICE).
