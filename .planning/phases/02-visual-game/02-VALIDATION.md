---
phase: 2
slug: visual-game
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Browser-based test runner (custom assertEqual/assertTrue) |
| **Config file** | `tests/test.html` loads `tests/engine.test.js` + `tests/ui.test.js` |
| **Quick run command** | `open tests/test.html` — check browser console for pass/fail |
| **Full suite command** | `open tests/test.html` — verify all test counts green in console |
| **Estimated runtime** | ~5 seconds (no Node runner — browser-based) |

---

## Sampling Rate

- **After every task commit:** Run `open tests/test.html` and verify console output
- **After every plan wave:** Full visual playthrough of a complete round in browser
- **Before `/gsd:verify-work`:** All unit tests pass + complete round plays through deal/play/discard cycle
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-W0-01 | W0 | 0 | ANIM-04, ANIM-05, CODE-01, CODE-03, CODE-04 | unit | `open tests/test.html` | ❌ W0 | ⬜ pending |
| 02-W0-02 | W0 | 0 | ANIM-01, ANIM-02, ANIM-03 | manual checklist | Visual inspection | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ui.test.js` — covers ANIM-04, ANIM-05, CODE-01, CODE-03, CODE-04
- [ ] `tests/test.html` — updated to load `ui.test.js` in addition to `engine.test.js`
- [ ] Manual test checklist document for ANIM-01, ANIM-02, ANIM-03 visual behaviors

*Existing engine test infrastructure covers Phase 1 unit tests — Wave 0 extends it with UI tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cards slide in from deck with stagger | ANIM-01 | CSS transition visual — no DOM assertion captures timing feel | Deal a hand; observe cards animate in sequence from shoe position with ~100ms stagger |
| Dealer hole card flips with 3D rotateY | ANIM-02 | CSS 3D transform — visual inspection only | Complete a round; observe dealer card flip with smooth 3D rotation (~300ms) |
| Cards sweep to discard pile | ANIM-03 | CSS transition visual — destination is visual, not data | End a round; observe all cards animate to discard zone with stagger |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
