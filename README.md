# Snowtree

**Run multiple AI coding sessions in parallel, each in its own git worktree.**

## Features

- **Parallel AI Sessions** - Run Claude Code, Codex, or other AI tools simultaneously
- **Auto-managed Worktrees** - Each session gets its own isolated git worktree
- **Diff Review** - Review and approve AI changes before commit
- **Session Timeline** - Full history of commands and changes

## Screenshots

<table>
  <tr>
    <td align="center"><b>Chat Interface</b></td>
    <td align="center"><b>Diff Review</b></td>
  </tr>
  <tr>
    <td><img src="assets/chat.png" alt="Chat Interface" /></td>
    <td><img src="assets/diff-review.png" alt="Diff Review" /></td>
  </tr>
</table>

## Installation

### One-line Install (macOS & Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/BohuTANG/snowtree/main/install.sh | sh
```

### Manual Download

Download from [GitHub Releases](https://github.com/BohuTANG/snowtree/releases):

| Platform | File |
|----------|------|
| macOS (Intel & Apple Silicon) | `snowtree-*-macOS-universal.dmg` |
| Linux (Debian/Ubuntu) | `snowtree-*-linux-x64.deb` |
| Linux (Other) | `snowtree-*-linux-x64.AppImage` |

### Build from Source

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
