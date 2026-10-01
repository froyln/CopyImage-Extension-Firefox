---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/*_test.*"
  - "**/test_*.*"
  - "tests/**"
  - "test/**"
  - "__tests__/**"
---
# Testing rules

- Test runner and commands: see `AGENTS.md` → Commands. Run the smallest check that proves
  the change (single file / single test) while iterating; the full `node --test && npx --yes web-ext lint -s src`
  before finishing.
- Bug fix = a failing test first that reproduces the symptom, then the fix. Name the test
  after the behavior, not the ticket.
- Test behavior through public interfaces. Avoid mocks for code you own; mock only I/O
  and third-party boundaries.
- Only pure logic (`src/name.js`) is unit-tested, loaded via `node:vm` because src files
  are classic scripts, not modules. Browser code is verified by hand (AGENTS.md → Verification).
- Never delete or skip a failing test to get green. Report it and stop.
