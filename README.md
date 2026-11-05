# CodePrism — Code Similarity and Plagiarism Detector

DSA 3 mini project, idea 1. **Similarity detection, not proof of plagiarism.**

## Run

Extract the ZIP. All deliverable files are together in the `codeprism` folder.
Open `index.html` in a modern browser. If local-file security prevents the worker from starting, serve this folder using VS Code Live Server or run `python -m http.server 8000` inside the folder and open `http://localhost:8000`.

There are no dependencies, API keys, build steps or application backend. HTML, CSS and plain JavaScript run the complete analysis in the browser. A background Web Worker keeps the page responsive and supports cancellation. No uploaded source is executed or transmitted. Refreshing the page clears the workspace.

## Publish to GitHub Pages

1. Create a GitHub repository.
2. Upload the **contents** of `codeprism` into the repository root, so `index.html`, `app.js`, `engine.js`, `styles.css` and `hero.png` sit together. Do not upload only `index.html` or the ZIP.
3. Open repository Settings → Pages.
4. Under Build and deployment, choose Deploy from a branch.
5. Choose your `main` branch and `/(root)`, then Save.
6. Once deployment completes, open the URL shown in Pages settings.

Reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Use the application

- Browse or drag in 2–12 programs. Use the real checkboxes to select or deselect files without removing them. Select all supports an intermediate state. Only checked programs are compared; at least two are required. The selected count and number of pairs update immediately.
- Choose Exact or Normalised. The description updates with your choice; expand “Which matching mode should I use?” for plain-language examples. Whitespace and comments are ignored in both modes.
- Set the minimum contiguous shared block (2–30 tokens, default 5).
- Compare programs. Select any pair in the ranked report to scroll directly to Follow the evidence. The sticky step navigation, View evidence link and Back to comparison table link connect the workflow.
- Green highlights mark tokens covered by qualifying matches. Select a block to highlight that evidence in amber and jump to its location.
- Expand the algorithm explorer for suffix-array positions and Kasai LCP values.
- Export a JSON report containing scores, settings and evidence positions. Source text is not exported.
- Changes to files or settings invalidate the old report. Compare again to update it.

## Requirement mapping

| Assignment requirement | Implementation |
| --- | --- |
| Tokenise source code | `engine.js`: `tokenize`, with original source offsets |
| Build a suffix array | `suffixArray`, prefix-doubling with rank pairs |
| Use Kasai's algorithm for longest common prefixes | `kasai`, inverse ranks and reused prefix length |
| Identify matching blocks across files | Combined token stream, unique separators, opposite-owner suffix scans |
| Upload two programs | Multi-file picker and drag-and-drop; supports 2–12 |
| Highlight shared blocks | Side-by-side original code, green coverage and amber selected block |
| Provide a similarity score | Symmetric token coverage percentage for every pair |
| Label as similarity, not proof of plagiarism | Persistent notice, documentation and exported report |
| Colourful, animated UI | Lavender/teal/coral palette, floating artwork, hover motion, animated result transitions, reduced-motion support |
| One folder; host index.html on GitHub | Buildless relative assets; no server-side runtime |

## Algorithm details

For each pair, assign integer IDs to token values. Concatenate A, a unique separator, B and another unique separator. Neither separator can appear as a source token.

1. Prefix doubling sorts suffixes using `(rank[i], rank[i+k])` until ranks are unique. Stable counting sorts over the two ranks make each doubling round O(n), giving O(n log n) total time and O(n) working arrays. Initial token-rank compression takes O(n log n).
2. Kasai computes `LCP[r]` between suffix `SA[r]` and its previous neighbour. It reuses the previous match length minus one, giving O(n) time.
3. A suffix's best cross-file match lies at its nearest opposite-file suffix on the left or right. The LCP between any two suffixes is the minimum adjacent LCP along the interval. Two directional scans per owner compute these maxima in O(n).
4. Every suffix with a best match of at least the threshold contributes an interval of covered tokens. Difference arrays combine overlaps without double counting. Scores include coverage in both directions, including repeated occurrences.
5. Representative evidence is collected from both directions, including repeated occurrences in either file, deduplicated by alignment and sorted by length. At most 150 evidence blocks are displayed/exported per pair; coverage uses all matches. The explorer displays the first 80 suffixes.

**Score = 100 × (covered tokens A + covered tokens B) / (tokens A + tokens B).** Empty combined token streams score zero. A short file fully contained in a much longer one need not score 100%, because the score is symmetric.

For F similarly sized files, all-pairs comparison is O(F² n log n). Keeping pair masks and result evidence uses additional O(F² n) result storage. Limits: 200 KB/file, 8,000 tokens/file, 30,000 total tokens, 12 files.

## Language support and limitations

Designed for ordinary Python, JavaScript/TypeScript, Java and C/C++ source. It accepts `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.java`, `.c`, `.cpp`, `.cc`, `.h`, `.hpp`, `.cs`, `.go`, `.rs` and `.txt`. Other accepted extensions use the generic C-style lexer. Use `.py` for Python comment handling; a Python program stored as `.txt` uses the generic lexer.

This is a lightweight lexical analyser, not a complete grammar parser. The scanner recognises Unicode identifiers, compound operators (including Python floor division), base-prefixed and scientific numeric literals, escaped and triple-quoted strings, Python string prefixes, C++ raw strings and JavaScript regex literals in common expression-start contexts. Language-specific keyword sets distinguish identifiers from syntax. Source offsets remain tied to the original text.

Normalised mode numbers identifiers by first occurrence within each file, preserving repeated-name relationships: `x+x` does not become identical to `a+b`. Member/API names after `.`, `?.` or `::` remain unchanged. Common Python built-ins are preserved unless a straightforward declaration in the token stream shadows them. Numeric/string/regex literals are replaced by category placeholders. Python f-strings and JavaScript templates are deliberately retained verbatim so embedded code is not silently discarded.

Normalisation is conservative and lexical. It does not perform scope resolution; shadowing through function arguments, complex declarations and imports is not fully modelled. Declaration reordering or an extra earlier identifier can shift first-occurrence numbering and reduce matches. Python indentation is ignored. JavaScript regex detection is heuristic, nested template interpolation is not fully parsed, and language-specific exotic literal forms may not be recognised. Generic C-style handling applies to accepted extensions without a dedicated language profile. Compare the same language for meaningful results.

The scoring strategy remains symmetric token coverage, not a claim of semantic equivalence or a calibrated plagiarism probability. Changed literals can still produce coincidental normalised matches; common algorithms and templates are not automatically excluded. Different algorithms solving the same problem can score low. Inspect the highlighted evidence, mode and minimum block length together. No result establishes authorship or intent.

## Demo for presentation

1. Click Try a sample, then Compare programs. The renamed pair scores 100% in normalised mode; the different program has only a short common function declaration.
2. Switch to exact mode and compare again. Explain why renamed identifiers change the score.
3. Untick a file, confirm the comparison count changes, and compare the remaining programs. Re-select it to compare again. Click a pair to jump to its evidence.
4. Select a matching block and inspect its line positions.
5. Expand the suffix/LCP explorer. Explain that LCP measures tokens, not characters.
6. Raise the minimum block length and compare again to remove short boilerplate matches.
7. Export the report and discuss why similarity alone is not proof of plagiarism.

## Tests

Run `node test.js` and `node test-improvements.js` (Node is only required for tests). The deterministic suite checks suffix ordering and LCP against direct computation, 400 random pair comparisons against an exhaustive matching oracle, token offsets, comment handling, normalisation, empty input, multiple files, Python floor division and limits. See `TEST_RESULTS.md` for recorded validation.

## Usability refinements

Real selectable file rows, select-all state, keyboard-focus preservation, selected-only analysis and stale-report invalidation. No extra application features were added. The light theme now includes JavaScript scroll reveals, a pointer-driven 3D artwork tilt, clearer evidence navigation and reduced-motion support. No Three.js dependency or external runtime is required.

## Files

- `index.html`: complete page and accessible controls
- `styles.css`: responsive light theme and animations
- `app.js`: files, worker orchestration, reports, highlights and exports
- `engine.js`: tokeniser, suffix array, Kasai LCP and similarity engine
- `hero.png`: bundled generated decorative illustration
- `sample_original.py`, `sample_renamed.py`, `sample_different.py`: runnable input examples
- `test.js`: 589 dependency-free baseline engine checks
- `test-improvements.js`: 140 lexical, normalisation, evidence and validation regression checks
- `TEST_RESULTS.md`: validation record
- `.nojekyll`: static hosting marker
