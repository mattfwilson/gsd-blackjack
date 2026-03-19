---
phase: 3
slug: full-casino-rules
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom assert functions in `tests/engine.test.js` (browser ES module + console runner) |
| **Config file** | `tests/test.html` (browser entry point) |
| **Quick run command** | Open `tests/test.html` in browser, check console |
| **Full suite command** | Same — single test file covers all engine tests |
| **Estimated runtime** | ~5 seconds (manual browser open) |

---

## Sampling Rate

- **After every task commit:** Open `tests/test.html` in browser, verify all PASS
- **After every plan wave:** Full test suite green + manual visual inspection of split/insurance UI
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds (browser open + scan)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | ACTN-04, ACTN-05, ACTN-06, ACTN-07, DEAL-02, DEAL-03, SND-03 | unit | Open `tests/test.html` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | ACTN-04 | unit | Open `tests/test.html` -- split section | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | ACTN-05, ACTN-06 | unit | Open `tests/test.html` -- split guard | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | ACTN-07 | unit | Open `tests/test.html` -- insurance section | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 1 | DEAL-02, DEAL-03 | unit | Open `tests/test.html` -- deviation section | ❌ W0 | ⬜ pending |
| 3-02-xx | 02 | 2 | ACTN-04, ACTN-07 | manual | Visual inspection in browser | N/A | ⬜ pending |
| 3-03-xx | 03 | 3 | SND-02, SND-03 | manual+unit | Open `tests/test.html` + visual | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/engine.test.js` — add split tests (split creates 2 hands, split aces auto-stand, no re-split, no double-after-split, per-hand payouts)
- [ ] `tests/engine.test.js` — add insurance tests (insurance offered when dealer shows ace, half-bet deducted, 2:1 payout on dealer BJ, insurance lost on no-BJ)
- [ ] `tests/engine.test.js` — add deviation tests (deviation counter increments, dealer can hit above 17, dealer can stand below 17)
- [ ] `tests/engine.test.js` — add new SoundManager stub tests (splitPlaced, insurancePlaced, insuranceWon exist and return undefined)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sound stubs fire at AnimationManager lifecycle events (not state changes) | SND-02 | Audio timing requires real browser animation inspection | Play through a split hand and insurance round; confirm sound stubs log at correct animation await points in console |
| Active hand glow toggles correctly between hand 0 and hand 1 | ACTN-04 | Visual CSS class toggle — no automated DOM assertion in current test infra | Trigger a split; observe gold/white border on active hand zone; verify it moves to hand 1 after hand 0 completes |
| Insurance buttons appear in amber/gold style | ACTN-07 | Visual styling verification | When dealer shows ace, confirm controls zone shows amber buttons replacing normal action buttons |
| Sequential result banners show hand 1, hand 2, then net | ACTN-04 | Animation sequence timing | Complete a split round; confirm three banners appear sequentially with correct results |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
