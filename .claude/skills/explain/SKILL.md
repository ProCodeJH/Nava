---
name: explain
description: |
  Explain code, concepts, errors, or architecture in clear language.
  Triggers: explain, what is, how does, why, what does this do, meaning, purpose,
  설명해, 이게 뭐야, 이거 왜 이래, 뭐하는 거야, 무슨 뜻이야, 이해가 안 돼,
  알려줘, 가르쳐줘, 이거 뭐야, 왜 이렇게 해, 차이가 뭐야, 비교해,
  개념, 원리, 이거 읽어봐, 해석해, 번역해 코드를, what does this mean,
  ELI5, in simple terms, break down, walk me through
context: inline
allowed-tools: Read, Grep, Glob, WebSearch
---

# Explain

Provide clear, educational explanations of code, concepts, errors, or architecture.

## Task
Explain: $ARGUMENTS

## Method

### If explaining CODE:
1. Read the target file/function
2. Break down line-by-line what it does
3. Explain the WHY, not just the WHAT
4. Point out patterns, idioms, or clever techniques
5. Note any potential issues or improvements

### If explaining a CONCEPT:
1. Start with a one-sentence definition
2. Give a real-world analogy
3. Show a minimal code example
4. Explain when/why to use it
5. Common pitfalls

### If explaining an ERROR:
1. Parse the error message
2. Identify the root cause
3. Explain what triggered it
4. Show how to fix it
5. How to prevent it in the future

## Output Style
- Use Korean (반말) matching 자현's style
- Use analogies and diagrams when helpful
- Keep it practical — theory only when necessary
- Adjust depth to complexity: simple → 3 lines, complex → full breakdown
