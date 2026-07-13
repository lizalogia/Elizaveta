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
we talked about", "like last time"), a new conversation opens on a topic
where prior context would obviously change the answer, **or the user simply
mentions a name/project/topic that matches something in the index** — that
last case must not require an explicit question. See "Recognizing mentions
automatically" below.

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

## Recognizing mentions automatically

The point of this skill is that the user shouldn't have to ask "what do you
remember about X" — mentioning X should be enough, the way it would be with
a person. Two things make that work together:

1. **The index must already be in context.** Set up the `SessionStart` hook
   below the first time this skill is used in an environment — it is not
   optional extra credit, it's what makes recognition passive instead of
   requiring a manual lookup every turn. Do it once per environment without
   waiting to be asked separately.
2. **Treat the loaded index as active knowledge, not archive.** Once
   `index.md` is in context (via the hook, or because you read it earlier
   this session), scan each new user message for any name/topic/keyword
   that matches an index entry — including partial matches, nicknames, or
   the Russian/English equivalent of a term. The moment one matches:
   - Silently open the matching `topics/<slug>.md` (don't narrate "let me
     check my memory" as a separate step — just do it).
   - Fold the relevant facts into your response naturally, flagged as
     recalled (e.g. "ты говорила раньше, что...").
   - Don't do this for generic words that happen to overlap with a slug —
     only act when the mention is plausibly about the same
     person/project/topic.

If the hook isn't set up yet in the current environment (no memory content
appeared automatically at the start of this conversation), read
`index.md` yourself as the first step of handling this skill, so the rest
of the conversation can pattern-match against it.

## Setting up auto-loading (do this once per environment)

A `SessionStart` hook injects `index.md` into context automatically at the
start of every session, so recognition (above) works without a manual
lookup. Set this up the first time this skill is relevant in a given
environment — don't wait for the user to separately ask for "always
remember" behavior, that's what they mean when they ask for this skill.

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
only surfaces the index — Claude still opens the relevant `topics/*.md`
file per the steps above when a specific topic actually comes up. Tell the
user once that this is set up and will take effect starting next session
(hooks fire at session start, so it won't retroactively affect the current
one).

## Maintenance

- Keep `index.md` from growing without bound: when it gets long, fold old
  entries into their topic files' history and trim the index to what's
  still relevant, rather than deleting history outright.
- Prefer editing/appending to an existing topic file over creating a
  near-duplicate with a slightly different slug.
- Never invent memory — every recall must trace back to something actually
  read from the store this session.
