# Architecture

[Wiki home](../README.md) · Full doc: [architecture.md](../../architecture.md)

Three layers: **Preset** (role) · **Session log** (episode) · **Project memory** (organizational knowledge).

Integration: Cordis plugin — tools + `agent/pre-step` inject — **no fork** of agent-loop.

Runtime: blank session → bounded `index.md` inject → `recall` / `remember` / `memory_status` on disk under `.dsh/memory/`.

See [Tools API](tools-api.md) and [On-disk format](on-disk-format.md).
