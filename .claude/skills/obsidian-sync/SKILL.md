---
name: obsidian-sync
description: |
  Quick Obsidian note access — daily notes, search, create, edit, tasks, tags.
  Triggers: note, memo, obsidian, daily, journal, diary, todo, task list, tag,
  노트, 메모, 일지, 할 일, 적어둬, 기록해, 오늘 일지, 메모 찾아줘, 할 일 뭐 있어,
  메모해, 적어, 기록, 일기, 오늘 뭐 했지, 노트 만들어, 태그, 투두, 정리해둬,
  write down, remember this, take note, what did I do today
context: inline
allowed-tools: Bash
---

# Obsidian Sync

Quick access to Obsidian vault via nava.mjs CLI.

## Commands
```bash
CLI="node C:/Users/exodia/.local/bin/Nava/Nava/naba-tools/nava.mjs"

# Daily note
$CLI obs daily

# Search notes
$CLI obs search query="search term"

# Read a note
$CLI obs read file=NoteName

# Create a note
$CLI obs create name=NoteName content="note content"

# List tags
$CLI obs tags counts

# View tasks
$CLI obs tasks
```

## Task
Execute the user's Obsidian request: $ARGUMENTS

## Rules
- Parse nava.mjs JSON output before displaying
- Format note content as clean markdown
- When creating notes, use consistent naming: YYYY-MM-DD for dates, kebab-case for topics
- Suggest related notes when relevant
