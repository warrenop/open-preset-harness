# Overview

[Wiki home](../README.md) · [中文](../zh/概述.md)

**open-preset-harness** adds **project-scoped organizational memory** on [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness): any preset can write; any preset can `recall` when needed.

## Problem

Team knowledge lives at the **project** level, not inside a single preset or session. Without shared memory, roles rediscover the same facts every sprint.

## Plugin

| Field | Value |
|-------|-------|
| Package | `dsh-tool-project-memory` |
| Category | Memory |
| Path | `packages/tool-project-memory/` |
| Default dir | `<projectRoot>/.dsh/memory/` |

## Principles

- One memory pool per project (organized by **domain**, not preset id)
- Index on blank session + **recall on demand**
- **Model-visible ⟺ logged**

Next: [Installation](installation.md)
