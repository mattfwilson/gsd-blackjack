---
phase: 1
slug: game-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom browser-loadable harness (vanilla JS, no framework) |
| **Config file** | none — `tests/test.html` loads `tests/engine.test.js` as ES module |
| **Quick run command** | Open `tests/test.html` in browser, check console |
| **Full suite command** | Open `tests/test.html` in browser, check console |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Open `tests/test.html` in browser, verify all PASS in console
- **After every plan wave:** Full test suite via test.html
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-W0-01 | W0 | 0 | CORE-01..SND-01 | unit/manual | Wave 0 creates test files | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | CORE-01 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | CORE-02 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | CORE-03 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | CORE-04 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | CORE-05 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | CORE-06 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | CORE-07 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | BET-01 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | BET-02 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | BET-03 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | BET-04 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | BET-05 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | ACTN-01 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | ACTN-02 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | ACTN-03 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | DEAL-01 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |
| 1-01-xx | TBD | 1+ | CODE-02 | manual | Code review | N/A — manual | ⬜ pending |
| 1-01-xx | TBD | 1+ | CODE-05 | manual | Code review + console check for window leaks | N/A — manual | ⬜ pending |
| 1-01-xx | TBD | 1+ | CODE-06 | manual | Code review — grep for document/window | N/A — manual | ⬜ pending |
| 1-01-xx | TBD | 1+ | SND-01 | unit | Open test.html, check console | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/engine.test.js` — full test suite covering all requirements above
- [ ] `tests/test.html` — browser harness HTML file that loads engine.test.js as ES module

*No framework install needed — vanilla JS test harness.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No shadowing of reserved words | CODE-02 | Static analysis / code review | Read all JS files, check for use of `class`, `let`, `const`, etc. as identifiers |
| ES Modules, no globals | CODE-05 | Requires browser console inspection | Load app in browser, check `window` object for unexpected properties |
| Zero DOM access in GameEngine | CODE-06 | Requires code review | `grep -r "document\|window" src/engine/` — must return zero results |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
