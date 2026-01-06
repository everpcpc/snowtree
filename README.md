# Snowtree

**Run multiple AI coding sessions in parallel, each in its own git worktree.**

## Why

- Single AI session blocks everything, manual worktree management is painful
- Trust issues? No clear view of what AI changed

**Snowtree solves this**:

- Parallel AI sessions (Claude Code, Codex)
- Auto-managed git worktrees
- Review & approve changes before commit
- Session history & timeline

## Quick Start

```bash
make install
make run
```

## Testing

```bash
make check         # typecheck + lint + unit tests
make e2e           # Playwright (browser)
make e2e-electron  # Playwright (Electron; needs a display on Linux)
```

Run `make` to see all available targets.

## License

Apache-2.0 © 2026 BohuTANG
