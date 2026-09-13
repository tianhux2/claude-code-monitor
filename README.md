# Claude Code: Terminal & Task Monitor

A real-time Bash task monitor for Claude Code in VS Code and Antigravity IDE.

---

## Overview

Claude Code: Terminal & Task Monitor captures and displays Bash command execution from Claude Code sessions inside a dedicated sidebar panel. It separates stdout and stderr into distinct streams, tracks process status and execution times, and organizes command history by session.

---

## How to Use

### 1. Installation

Build and package the extension:

```bash
npx @vscode/vsce package --no-git-tag-version
```

In VS Code:
1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Run `Extensions: Install from VSIX...`.
3. Select the generated `.vsix` file.

### 2. Hook Setup

When activated, the extension automatically inspects `~/.claude/settings.json` and configures the required Bash hooks. If configuring manually, add the following to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"<extension-path>/hooks/pre.js\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"<extension-path>/hooks/post.js\""
          }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"<extension-path>/hooks/post.js\""
          }
        ]
      }
    ],
    "PermissionDenied": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"<extension-path>/hooks/post.js\""
          }
        ]
      }
    ]
  }
}
```

### 3. Monitoring Commands

1. Open the **Claude Monitor** view from the Activity Bar.
2. When Claude Code executes a Bash command, a task entry appears under the active session with its status, exit code, and durations.
3. Click any task to view its terminal output.
4. Filter stream output using the tabs (**All**, **stdout**, **stderr**).
5. Filter or search tasks using category pills (**All**, **Git**, **Build**, **Test**, **Script**) or the search box.
6. Click the **Scroll** button to toggle auto-scrolling when new lines arrive.
7. Click **Log** to open the complete `.out` log file directly in an editor tab.

### 4. Toolbar and Settings

- **Claude Hook**: Toggle the Bash hook on or off. When turned off, commands execute normally without being intercepted.
- **Auto-Follow**: Toggle whether the view automatically selects and follows the newest command (`$(target)` when enabled, `$(circle-slash)` when paused).
- **Refresh**: Reload session and task metadata from disk.
- **Settings (⚙️)**:
  - **Interface Language**: Switch between Auto, English, and Simplified Chinese.
  - **Appearance Theme**: Switch between Auto, Dark, Light, and High Contrast.
  - **Runs Directory**: Copy the log path or open it in the system file explorer.
  - **Clear Completed Tasks**: Delete disk logs for finished tasks (active and background tasks are preserved).

---

## Configuration Options

Configure these options via Command Palette (`Ctrl+Shift+P` -> search for `Preferences: Open Settings` and type `claudeCodeMonitor`), or through the in-panel Settings dialog (⚙️):

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `claudeCodeMonitor.runsDir` | string | `""` | Directory for task logs. Defaults to `~/.claude/bash-runs` when empty. |
| `claudeCodeMonitor.maxLines` | number | `3000` | Maximum line count displayed in the embedded terminal panel. |
| `claudeCodeMonitor.autoFollow` | boolean | `true` | Automatically select and follow the latest command when it starts. |
| `claudeCodeMonitor.language` | string | `"auto"` | Display language (`"auto"`, `"en"`, or `"zh"`). |
| `claudeCodeMonitor.theme` | string | `"auto"` | UI color theme (`"auto"`, `"dark"`, `"light"`, or `"high-contrast"`). |

---

## File Storage Structure

Task logs and metadata are stored in `~/.claude/bash-runs/<session_id>/`:
- `<run_id>.cmd`: Original command string.
- `<run_id>.out`: Standard output stream log.
- `<run_id>.err`: Standard error stream log.
- `<run_id>.json`: Task metadata (status, exit code, start/end times, durations, PIDs).
- `<run_id>.wrapper.log`: Wrapper process lifecycle events and timestamps.
