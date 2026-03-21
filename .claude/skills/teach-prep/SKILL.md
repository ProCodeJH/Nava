---
name: teach-prep
description: |
  Prepare educational content in the codingssok textbook style.
  Unit structure, progressive difficulty, visual aids, practice problems.
  Triggers: teach, textbook, lesson, unit, exercise, curriculum, problem set, quiz,
  교재, 코딩쏙, 수업 준비, 교육, 수업 자료 만들어, 다음 단원, 문제 만들어줘, 교재 내용,
  유닛, 라운드, 실습, 챌린지, 시험 문제, 퀴즈, 수업, 가르쳐, 설명해줘 학생한테,
  C언어, 파이썬, 코딩 교육, 기초부터, 단계별, 난이도
context: fork
agent: general-purpose
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Teach Prep — 코딩쏙 Content Generator

Generate educational content following the codingssok v2 textbook format.

## Reference Files
- C언어 교재: Check memory for current progress (u11 완료)
- Python 교재: Check memory for current progress (u04 완료)

## Content Structure (per Round)
Each Round (R) follows this pattern:
1. **도입** — Hook with relatable scenario
2. **개념 설명** — Core concept with visual aids (ASCII diagrams, tables)
3. **코드 예제** — Annotated code with line-by-line explanation
4. **실습** — Guided exercise (scaffolded)
5. **챌린지** — Independent problem
6. **정리** — Key takeaways in 3 bullets

## Style Rules
- 반말 (casual Korean), friendly but precise
- Every concept needs a visual (diagram, table, or flowchart)
- Code comments in Korean
- Progressive difficulty: R1(기초) → R4(응용) → R5(대회) → R6(종합)
- Max 1 new concept per section
- Every code example must be runnable as-is

## Task
Prepare content for: $ARGUMENTS

If a project directory is available, read existing units to match established style.
