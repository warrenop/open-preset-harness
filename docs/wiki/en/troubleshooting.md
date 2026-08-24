# Troubleshooting

[Wiki home](../README.md) · [中文](../zh/故障排查.md)

| Issue | Fix |
|-------|-----|
| `pnpm not found` | `curl -fsSL https://get.pnpm.io/install.sh \| sh -` |
| `EACCES` from corepack | Use pnpm install script, not `corepack enable` |
| `path:packages/...` zsh error | Quote the full GitHub source string |
| Plugin missing in dump-config | Install on the same profile you run (`web` vs `headless`) |
| No writes | Check `.git` / `project_root`, `readOnly` config |
