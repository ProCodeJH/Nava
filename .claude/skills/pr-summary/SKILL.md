---
name: pr-summary
description: |
  Summarize pull request changes with diff analysis and review notes.
  Triggers: PR summary, pull request, PR review, summarize PR, diff, merge check,
  PR 요약, 풀리퀘스트, PR 봐줘, 머지해도 되나, 변경사항 정리해줘,
  이거 머지해도 돼, PR 확인해, 리뷰해줘, 뭐 바뀌었어, diff 봐줘,
  커밋 정리, 브랜치 비교, 충돌 확인, conflict
context: fork
agent: Explore
allowed-tools: Bash, Read, Grep, Glob
---

# PR Summary

## Current Branch Context
- Branch: !`git branch --show-current 2>/dev/null || echo "unknown"`
- Recent commits: !`git log --oneline -10 2>/dev/null || echo "no git"`

## Task
Analyze and summarize the pull request: $ARGUMENTS

### If PR number provided:
1. Fetch PR details: `gh pr view $ARGUMENTS`
2. Get diff: `gh pr diff $ARGUMENTS`
3. Get comments: `gh api repos/{owner}/{repo}/pulls/$ARGUMENTS/comments`

### If no PR number (current branch):
1. Get diff against main: `git diff main...HEAD`
2. Get commit history: `git log main..HEAD --oneline`

## Output Format

### Summary
- What changed and why (2-3 bullets)

### Changes by Area
- Group changes by component/module
- Note new files, deleted files, renamed files

### Risk Assessment
- Breaking changes: [yes/no + details]
- Test coverage: [covered/needs tests]
- Security concerns: [any OWASP issues]

### Review Notes
- Suggestions for improvement
- Questions for the author
