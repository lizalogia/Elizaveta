# Setting up resolve-claude-mcp

Prerequisites: **DaVinci Resolve Studio** 18.0+ (the free version has
limited scripting support), **Python** 3.10+, and the **uv** package
manager.

```bash
# uv install
brew install uv                                                  # macOS
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"  # Windows
curl -LsSf https://astral.sh/uv/install.sh | sh                  # Linux
```

## 1. Clone and sync

```bash
git clone https://github.com/barckley75/resolve-claude-mcp.git
cd resolve-claude-mcp
uv sync
```

Note the absolute path — it's needed in the next step.

## 2. Register the server with Claude Desktop

Edit (or create) `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add a `"resolve"` entry inside `"mcpServers"` (don't create a second
`mcpServers` key if one already exists):

**macOS**
```json
{
  "mcpServers": {
    "resolve": {
      "command": "uv",
      "args": ["--directory", "/absolute/path/to/resolve-claude-mcp", "run", "resolve-claude-mcp"],
      "env": {
        "RESOLVE_SCRIPT_LIB": "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so",
        "RESOLVE_SCRIPT_API": "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting",
        "PYTHONPATH": "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules/"
      }
    }
  }
}
```

**Windows**
```json
{
  "mcpServers": {
    "resolve": {
      "command": "uv",
      "args": ["--directory", "C:\\absolute\\path\\to\\resolve-claude-mcp", "run", "resolve-claude-mcp"],
      "env": {
        "RESOLVE_SCRIPT_LIB": "C:\\Program Files\\Blackmagic Design\\DaVinci Resolve\\fusionscript.dll",
        "RESOLVE_SCRIPT_API": "C:\\ProgramData\\Blackmagic Design\\DaVinci Resolve\\Support\\Developer\\Scripting",
        "PYTHONPATH": "C:\\ProgramData\\Blackmagic Design\\DaVinci Resolve\\Support\\Developer\\Scripting\\Modules\\"
      }
    }
  }
}
```
(If Resolve is installed on a non-default drive, update `RESOLVE_SCRIPT_LIB`
only — the other two paths stay under `C:\ProgramData\`.)

**Linux**
```json
{
  "mcpServers": {
    "resolve": {
      "command": "uv",
      "args": ["--directory", "/absolute/path/to/resolve-claude-mcp", "run", "resolve-claude-mcp"],
      "env": {
        "RESOLVE_SCRIPT_LIB": "/opt/resolve/libs/Fusion/fusionscript.so",
        "RESOLVE_SCRIPT_API": "/opt/resolve/Developer/Scripting",
        "PYTHONPATH": "/opt/resolve/Developer/Scripting/Modules/"
      }
    }
  }
}
```

If `uv` isn't on Claude Desktop's `PATH`, use its full path (`which uv` /
`where.exe uv` — typically `/opt/homebrew/bin/uv` on macOS Homebrew).

## 3. Enable scripting in Resolve

Preferences → General → **External scripting using** → `Local` (or
`Network` for a remote setup).

## 4. Restart Claude Desktop

Quit and reopen. The hammer icon should show the Resolve tools.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Could not connect to DaVinci Resolve" | Resolve Studio must be running; check scripting is enabled; verify `RESOLVE_SCRIPT_LIB` path |
| "Failed to import DaVinciResolveScript" | `PYTHONPATH` must point at the Modules directory |
| "No active timeline" | Open a project with a timeline loaded first |
| Tools not appearing | `uv --version` to confirm install; restart Claude Desktop; check its MCP server logs |
