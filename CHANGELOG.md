# Changelog

## 0.5.1 (2026-02-18)

### Fixed
- Correct alert icon SVG geometry.
- Add `tel:` to URL protocol allowlist.
- Add `sanitizeHref()` so blocked/invalid link URLs become inert (`#`) without breaking image/video URLs.
- Stack gap now snaps to design-space tokens and uses `--ap-space-*` CSS vars (no dead code).
- Theme switching updates the existing style element instead of remove/recreate (stable reference).

### Hardened
- Add `cssEscapeIdent()` fallback for safe CSS id selectors.
- Form `pattern` validation now applies heuristic safety checks (ReDoS mitigation) and caps test length.
- `el()` now accepts string/number/boolean children.

### Added
- Lifecycle event bus (`on/off`) with render/stream/section/action events.
- `updateSection`, `removeSection`, `toJSON` for round-trip and incremental updates.

## 0.5.0 (2026-02-17)
- Initial public v0.5.0 with tabset, forms, Trusted Types, CSP nonce, NDJSON streaming.
