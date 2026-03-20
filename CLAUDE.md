# CLAUDE.md

This file provides guidance to Claude Code when working with the LiteSpec project.

## Quick Reference

- **Project Type**: DSL compiler (LiteSpec → JSON Schema)
- **Language**: JavaScript ES6+
- **Build Tool**: esbuild
- **Output**: JSON Schema Draft 2020-12
- **Validation**: AJV (Another JSON Schema Validator)

## Build & Run

```bash
# Build the library
npm run build

# View the interactive editor
python3 -m http.server 3016
# Navigate to http://localhost:3016/views/
```

## Key Architecture

- Single-file parser/compiler: `src/index.js` (~900 lines)
- Converts LiteSpec DSL → JSON Schema with extensions (permissions, UI metadata, conditional rules)
- IIFE bundle exposes `window.litespec` with `parseDSL()` and `validateDataUsingSchema()`
- Syntax highlighters for CodeMirror and Sublime Text in `src/highlighters/`
- Used by Go Kart's schema builder UI to define data schemas

## File Structure

```
src/
  index.js                    — Main parser/compiler
  highlighters/
    litespec.mode.cm.js       — CodeMirror syntax highlighting
    LiteSpec.sublime-syntax   — Sublime Text syntax highlighting
dist/
  lite-spec.js                — Unbundled output
  lite-spec.min.js            — Minified output
examples/                     — Example .ls files
extra/
  model.ls                    — Full example with all features
  output.json                 — Generated JSON Schema
docs/
  lite-spec.md                — Full documentation
```

## Knowledge Bases

Structured JSON knowledge bases exist for this project and its related projects. Read the relevant ones when generating code, answering questions, or using slash commands.

- **LiteSpec**: `docs/lite-spec-knowledge.json` (16.5 KB) — schema DSL syntax, all attributes, conditional validation, API
- **Go Kart**: `/Users/matthewduffield/Documents/_learn/go-kart/docs/go-kart-knowledge.json` (38.7 KB) — template system, how schemas are consumed
- **Wave CSS**: `/Users/matthewduffield/Documents/_dev/wave-css/docs/wave-css-knowledge.json` (37.7 KB) — components that schemas generate UI for

### When to read knowledge bases
- `/create-schema` — reads LiteSpec knowledge
- `/create-screen` — reads all three (schema → template → UI)
- When modifying the parser — read LiteSpec knowledge for full attribute/syntax reference

### Project relationships
- **Go Kart** uses LiteSpec to define schemas that drive dynamic form/table generation
- **Go Kart** uses Wave CSS components for its frontend UI
- **LiteSpec** is the standalone schema DSL (consumed by Go Kart's schema builder)
- **Wave CSS** is the standalone component library
