---
name: codebase-viz
description: |
  Generate interactive HTML visualization of project structure, dependencies, and metrics.
  Triggers: visualize, codebase map, project structure, dependency graph, file tree, treemap,
  시각화, 구조도, 프로젝트 맵, 파일 구조 보여줘, 디렉토리 트리, 의존성 그래프,
  프로젝트 현황, 파일 분포, 코드 통계, 얼마나 큰지, 파일 몇 개야
context: fork
agent: general-purpose
allowed-tools: Bash, Read, Glob, Grep, Write
---

# Codebase Visualizer

Generate an interactive HTML file that visualizes the project structure.

## Task
Visualize the project at: $ARGUMENTS (default: current directory)

## Steps

1. **Scan** — Walk the directory tree, collecting:
   - File names, sizes, extensions
   - Directory hierarchy
   - Ignore: .git, node_modules, __pycache__, .venv, dist, build, .next

2. **Analyze** — Calculate:
   - File count by extension
   - Size distribution
   - Directory depth
   - Largest files
   - Import/dependency graph (if JS/TS/Python)

3. **Generate HTML** — Create a self-contained `codebase-map.html` with:
   - Collapsible directory tree
   - Color-coded file types
   - Size indicators
   - Summary sidebar (file count, dir count, total size, type breakdown)
   - Bar chart showing size by file type
   - Dark theme (background: #1a1a2e)

4. **Output** — Write to `codebase-map.html` in the target directory

## Tech
- Pure HTML/CSS/JS, no external dependencies
- Use JavaScript to build the tree dynamically from embedded JSON data
- Responsive layout with flexbox

## Style
Colors by extension:
- .js/#f7df1e, .ts/#3178c6, .py/#3776ab, .go/#00add8
- .rs/#dea584, .rb/#cc342d, .css/#264de4, .html/#e34c26
- .json/#6b7280, .md/#083fa1, .yaml/#cb171e
