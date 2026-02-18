# AgentPages v0.5.1

AgentPages is a **safe-by-construction** renderer for AI-generated pages. An LLM can output a constrained JSON “page spec”, and AgentPages renders it into DOM **without ever injecting untrusted HTML**.

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

- **No untrusted HTML injection:** all LLM/user strings render via DOM text nodes.
- **No `innerHTML` for user content.**
- **URL allowlist:** `http:`, `https:`, `mailto:`, `tel:`. Invalid/blocked link `href` becomes `#`.
- **Action sandbox:** actions are sanitized (`[a-zA-Z0-9:_-]`), then gated by `actionPolicy` + `allowedActions`.
- **Form pattern safety:** `pattern` is heuristically filtered to avoid pathological regex (ReDoS) and long inputs are capped for pattern tests.
- **CSP/Trusted Types:** `cspNonce` + optional Trusted Types policy support.

## License

MIT
