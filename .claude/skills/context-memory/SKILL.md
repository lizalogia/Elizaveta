---
name: context-memory
description: Use when the user wants Claude to remember or recall things across separate conversations — saving a fact, decision, or preference for later ("remember this", "запомни", "next time keep in mind"), recalling prior context ("what do you know about X", "как мы договорились в прошлый раз", "continue where we left off"), or at the start of a new conversation to check whether relevant history already exists. Not for in-conversation scratch notes or TODOs that only matter for the current task.
---

# Context memory

Claude Code starts every conversation with a blank slate — nothing from a
previous session carries over unless it's written to disk. This skill gives
Claude a persistent notes store it reads from and writes to, so facts,
decisions, and preferences survive across sessions.

## Storage location

Pick the store based on where the session is running:

- **Local machine (normal Claude Code CLI):** use `~/.claude/memory/`. The
  user's home directory persists across every session, so this is the
  default.
- **Ephemeral/remote session (Claude Code on the web, a container that gets
  reclaimed after the session ends):** `$HOME` will NOT survive to the next
  session. Use `.claude/memory/` inside the current git repo instead, and
  commit + push any changes you make — git history is what persists here,
  not the filesystem.

If unsure which applies, check whether `.git` exists in the working
directory and whether the environment looks ephemeral (see the system
prompt for environment details). When genuinely ambiguous, ask the user
once, then stick with that choice.

Layout inside the memory store (same layout either way):

```
memory/
  index.md              # chronological log, one line per entry
  topics/
    <slug>.md            # longer-running notes on one topic/person/project
```

`index.md` line format:

```
- 2026-07-09: <one-line summary> — see topics/<slug>.md
```

Keep `index.md` skimmable — it exists so a future Claude can grep/read one
short file and decide what's relevant, not to hold full detail. Full detail
(context, reasoning, quotes) goes in the matching `topics/<slug>.md` file as
a dated section:

```
## 2026-07-09
<details>
```

Slugs are short, lowercase, hyphenated, and stable — reuse the same slug
every time the topic comes up again instead of creating near-duplicate
files.

## Saving memory

Trigger: the user explicitly asks Claude to remember something, or states a
durable fact/decision/preference that would obviously be useful in a later,
unrelated conversation (e.g. "I prefer TypeScript over JS", "our deploy
process is X", "call me Liza").

Do NOT save: secrets, credentials, API keys, tokens, or anything the user
shares only for the current task's sake. If a fact looks sensitive, ask
before writing it down, or skip it.

Steps:
1. Pick (or create) a topic slug.
2. Append a dated section to `topics/<slug>.md` (create the file with a
   one-line `# <Topic>` header if new).
3. Append one line to `index.md`.
4. If using the git-backed store (remote/ephemeral case), commit and push —
   uncommitted memory disappears with the container.
5. Briefly confirm what you saved, in one line — don't make a ceremony of
   it.

## Recalling memory

Trigger: the user asks what Claude knows/remembers about something, refers
to earlier discussion Claude has no record of in the current context ("as
we talked about", "like last time"), or a new conversation opens on a topic
where prior context would obviously change the answer.

Steps:
1. Check whether the memory store exists at all before doing anything else
   (`ls ~/.claude/memory` or `ls .claude/memory`). If it doesn't, say so —
   don't fabricate history.
2. Read `index.md` first (cheap) and grep it for relevant keywords.
3. Only open the matching `topics/*.md` files you actually need — don't
   read the whole store into context for a narrow question.
4. Use what you find naturally in the response, and say plainly that it
   comes from saved memory (e.g. "from what you told me before, ...") so
   the user can correct it if it's stale.
5. If nothing relevant is found, say so instead of guessing.

## Auto-loading at session start (optional, one-time setup)

Reading memory only when asked misses the common case: the user expects
Claude to *already* know something without prompting. To fix this, a
`SessionStart` hook can inject `index.md` into context automatically at the
start of every session.

Set this up once, when the user asks for "always remember" behavior (not on
every invocation of this skill):

1. Load the `session-start-hook` skill if available — it covers the hook
   mechanics in this repo/environment.
2. Otherwise, add to `~/.claude/settings.json` (local/global memory) or the
   project's `.claude/settings.json` (git-backed memory):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat ~/.claude/memory/index.md 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

Adjust the path to `.claude/memory/index.md` for the git-backed case. This
only surfaces the index — Claude still needs to open the relevant
`topics/*.md` file per the recall steps above when a specific topic
matters.

## Maintenance

- Keep `index.md` from growing without bound: when it gets long, fold old
  entries into their topic files' history and trim the index to what's
  still relevant, rather than deleting history outright.
- Prefer editing/appending to an existing topic file over creating a
  near-duplicate with a slightly different slug.
- Never invent memory — every recall must trace back to something actually
  read from the store this session.
