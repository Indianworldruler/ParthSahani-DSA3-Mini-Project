# Validation record — revised project

Date: 5 November 2026

## Automated checks

- `node test.js`: **589 checks passed**. Suffix order and Kasai LCP checked against direct computation; 400 deterministic pair cases compared with an exhaustive matching oracle; source offsets, comments, multi-file processing and boundaries checked.
- `node test-improvements.js`: **140 checks passed**. Unicode names, numeric forms, Python floor division/prefixed/triple strings, C++ raw strings, JavaScript regex/division distinction, compound operators, escaped strings, preserved source offsets, 100 consistent-renaming cases, repeated evidence, and input validation.
- False-match controls verify that `x+x` differs from `a+b`, `append` differs from `remove`, Python built-in operations remain distinct, and embedded f-string/template code is not discarded during normalisation.
- JavaScript syntax checks: passed for `app.js`, `engine.js`, `test.js` and `test-improvements.js`.
- Total automated checks: **729**. This is test coverage, not an accuracy percentage on real student submissions.

## Browser checks (Chromium, HTTP preview)

- Sample files load with actual checked checkboxes.
- Deselecting two of three files shows one selected and disables comparison.
- Re-selecting a second file enables comparison; only those two appear in the report, producing one pair and 100% for the renamed sample.
- Select-all restores all files; any selection change invalidates the prior report.
- Expandable mode guide and dynamically updated mode summary display correctly.
- Clicking a pair scrolls to Follow the evidence and transfers keyboard focus.
- Report/evidence links and sticky step navigation are available after analysis.
- Four real challenge files uploaded successfully. Unticking the heap implementation and choosing Normalised produced exactly three programs and three comparisons; the unticked file stayed visible in the workspace and was absent from results.
- Selecting a matching block updates evidence; JSON export download completed.

## Challenge-file regression

At minimum 15 tokens, the supplied four-file challenge returns 34.2% for original/renamed BFS in Exact mode, and 100.0% in Normalised mode. Other pairs score 0% at that threshold. These are lexical scores, not proof of plagiarism. The same behaviour can be implemented with different algorithms and token sequences.

## Verification limits

No GitHub publication was performed. The unchanged buildless hosting approach remains compatible with static hosting. Browser checks used an HTTP preview; separate mobile-device, cross-browser and direct-file tests were not performed. Responsive layouts and reduced-motion support are included. No claim of semantic equivalence or maximum real-world detection accuracy is made.
