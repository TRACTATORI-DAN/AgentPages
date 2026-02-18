# AgentPages v0.5.1

AgentPages is a **safe-by-construction** renderer for AI-generated pages. An LLM can output a constrained JSON “page spec”, and AgentPages renders it into DOM **without ever injecting untrusted HTML**.

**"A runtime for AI agents to generate beautiful, consistent, secure web pages from structured JSON descriptions."**

No raw HTML injection. No XSS. No rigid templates. The LLM outputs a semantic page description → AgentPages renders it into styled, animated DOM with a built-in design system.

## The Problem

When AI agents need to display dynamic information (product details, comparisons, analytics, onboarding flows), you have two bad options:

1. **Raw HTML generation** — The LLM writes HTML/CSS/JS and you inject it into the DOM. This produces inconsistent styling, broken layouts, accessibility failures, and XSS vulnerabilities.

2. **Rigid templates** — You pre-build every possible page and slot data into fields. This kills expressiveness and can't handle unpredictable queries.

AgentPages is the middle ground: **expressive enough to generate arbitrary page layouts, safe by construction, and design-consistent via a built-in component system.**

## How It Works

```
Visitor asks question → LLM generates JSON page spec → AgentPages renders styled DOM
```

The LLM outputs a structured JSON object describing the page using semantic component types (hero, feature-grid, comparison-table, steps, FAQ, etc.). AgentPages renders each component into safe, styled DOM using a built-in design system. No innerHTML. No raw HTML. All content goes through textContent or sanitization.


## Install (browser)

Copy `agentpages.js` (or `AgentPages.js`) into your repo and load it:

```html
<div id="demo"></div>
<script src="./agentpages.js"></script>
<script>
  const ap = new AgentPages('#demo', {
    theme: 'light',
    actionPolicy: 'allowList',
    allowedActions: ['book_demo', 'download_pdf', 'form:submit']
  });

  ap.render({
    theme: 'light',
    style: { background: 'default' },
    sections: [
      { type: 'hero', title: 'Interact AI', subtitle: 'Live, safe demo pages', cta: { label: 'Book demo', url: 'https://example.com', action: 'book_demo' } },
      { type: 'tabset', tabs: [
        { id: 't1', label: 'Overview', content: [{ type: 'markdown', content: 'No HTML injection. Only schema.' }] },
        { id: 't2', label: 'FAQ', content: [{ type: 'faq', items: [{ q: 'Is it safe?', a: 'Yes.' }] }] }
      ] }
    ]
  });
</script>
```

## Component types (22)

AgentPages currently supports these section `type` values:

- `hero`
- `kpi`
- `features`
- `compare`
- `steps`
- `faq`
- `testimonial`
- `pricing`
- `cta`
- `table`
- `code`
- `markdown`
- `alert`
- `divider`
- `spacer`
- `badge`
- `list`
- `quote`
- `card`
- `stack`
- `media-block`
- `tabset`
- `form`
- `custom` (host-provided via `componentCatalog`)

You can also read them at runtime: `AgentPages.componentTypes`.

## Constructor options

```js
new AgentPages(target, options)
```

Key options:

- `theme`: `'light' | 'dark'` (default: `'light'`)
- `iconMode`: `'line' | 'solid' | 'none'` (default: `'line'`)
- `colors`: theme overrides (e.g. `{ colorPrimary: '#...' }`)
- `background`: `'default' | 'muted' | 'transparent'` (default: `'default'`)
- `useShadow`: `boolean` — render inside a ShadowRoot (default: `false`)
- `cspNonce`: `string` — applied to the injected `<style>` tag (default: `null`)
- `trustedTypesPolicyName`: `string` — policy name used when creating a Trusted Types policy (default: `'agentpages'`)
- `trustedTypesPolicy`: an existing policy object (if you manage policies externally)
- `actionPolicy`: `'allowAll' | 'allowList' | 'denyAll'` (default: `'allowList'`)
- `allowedActions`: `string[]` — action allowlist when `actionPolicy='allowList'`
- `onAction(actionName, event, payload)`: action callback
- `componentCatalog`: `{ [type: string]: (data, ctx) => HTMLElement }` — host-defined renderers for `custom` / extensions
- `safetyLimits`: overrides for default safety caps (sections/rows/depth/string length)

## Methods

- `render(pageSpec)` — render a full page
- `renderStream(readableStream)` — render from streaming JSON (LLM streaming)
- `renderStreamNDJSON(readableStream)` — render from NDJSON (one section per line)
- `addSection(sectionSpec)` — append a single section
- `updateSection(index, sectionSpec)` — replace a rendered section in-place
- `removeSection(index)` — remove a section by index
- `toJSON()` — export the current rendered page as JSON (round-trip friendly)
- `toHTML()` — export rendered DOM as HTML string
- `clear()` — clear all rendered sections
- `destroy()` — remove event listeners and cleanup

## Streaming (LLM integration)

### NDJSON (recommended)
Each line is a JSON object: `{ "type": "...", ... }`.

```js
await ap.renderStreamNDJSON(streamFromYourLLM);
```

### Streaming JSON (full page)
A single JSON object with `{ theme, style, sections: [...] }` streamed in chunks.

```js
await ap.renderStream(streamFromYourLLM);
```

## Events (lifecycle hooks)

```js
const off = ap.on('section:added', ({ index, section }) => {
  console.log('added', index, section.type);
});

ap.on('render:start', () => {});
ap.on('render:complete', ({ sections }) => {});
ap.on('stream:start', ({ mode }) => {});
ap.on('stream:complete', ({ mode, sections }) => {});
ap.on('section:updated', ({ index }) => {});
ap.on('section:removed', ({ index }) => {});
ap.on('action', ({ name, allowed }) => {});
ap.on('action:blocked', ({ name }) => {});

off(); // unsubscribe
```

## Security model
AgentPages is **safe by construction**, not by sanitization:
- The LLM outputs JSON, not HTML/CSS/JS
- All text content is set via `textContent` (not `innerHTML`)
- URLs are validated against a whitelist of protocols (`http:`, `https:`, `mailto:`)
- Icons are hardcoded SVG paths — no external resources
- The component system is a closed set — the LLM can only use defined types
- Custom renderers are developer-defined, not LLM-defined

## Positioning vs. Alternatives

| | AgentPages | Google A2UI | Raw HTML Gen | Templates |
|---|---|---|---|---|
| Expressiveness | High (22+ components + custom) | Medium (catalog-based) | Unlimited | Low |
| Security | Safe by construction | Safe by catalog | Dangerous | Safe |
| Dependencies | Zero | Framework renderer required | None | Varies |
| Streaming | Built-in | Built-in | Manual | N/A |
| Design consistency | Built-in design system | BYOC (bring your own components) | None | Rigid |
| Setup complexity | Script tag | Full stack integration | None | High |

## License

MIT
