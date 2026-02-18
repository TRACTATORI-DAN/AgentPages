# AgentPages

**A runtime for AI agents to generate beautiful, consistent, secure web pages from structured JSON descriptions.**

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

## Quick Start

```html
<div id="page-target"></div>
<script src="agentpages.js"></script>
<script>
const ap = new AgentPages({
  target: '#page-target',
  theme: 'light',
  onAction: (action) => console.log('CTA clicked:', action)
});

// Render a complete page
ap.render({
  sections: [
    {
      type: 'hero',
      heading: 'Welcome to Our Product',
      subheading: 'AI-generated page content',
      cta: { text: 'Get Started', action: 'signup' }
    },
    {
      type: 'feature-grid',
      items: [
        { icon: 'zap', title: 'Fast', body: 'Sub-second rendering' },
        { icon: 'shield', title: 'Secure', body: 'No XSS by design' },
        { icon: 'code', title: 'Simple', body: 'Zero dependencies' }
      ]
    }
  ]
});
</script>
```

## Streaming from LLM

```javascript
// Stream directly from a fetch response (e.g., Claude API)
const response = await fetch('/api/generate-page', {
  method: 'POST',
  body: JSON.stringify({ query: visitorQuestion })
});

await ap.renderFromResponse(response);
// Sections appear progressively as the LLM generates them
```

## LLM Integration

Get the system prompt snippet to instruct your LLM:

```javascript
const systemPrompt = AgentPages.getSystemPrompt();
// Add this to your LLM's system prompt
```

The system prompt instructs the model to output valid AgentPages JSON. Works with Claude, GPT-4, Gemini, and any model supporting structured output.

## Component Types

| Type | Description |
|------|-------------|
| `hero` | Full-width hero with heading, subheading, label, CTA |
| `heading` | Section heading (h1–h3) |
| `text` | Body text paragraph |
| `feature-grid` | Grid of feature cards with icons |
| `stat-row` | Row of statistics/metrics |
| `comparison-table` | Multi-column comparison table |
| `steps` | Numbered step sequence |
| `callout` | Info/success/warning/error callout box |
| `faq` | Expandable Q&A accordion |
| `quote` | Blockquote with author attribution |
| `list` | Bullet or numbered list |
| `code` | Code block with language header |
| `cta` | Call-to-action with primary/secondary buttons |
| `divider` | Visual separator |
| `columns` | Multi-column layout (2–4 cols) |
| `image-text` | Split layout with image + text |
| `timeline` | Chronological event timeline |

## Themes

Built-in: `light`, `dark`, `brand`

```javascript
// Switch at runtime
ap.setTheme('dark');

// Custom brand colors
const ap = new AgentPages({
  target: '#container',
  theme: 'light',
  colors: {
    colorPrimary: '#ff6b00',
    colorPrimaryHover: '#e55f00',
    colorBgAccent: '#fff5eb',
  }
});
```

## Custom Components

```javascript
const ap = new AgentPages({
  target: '#container',
  customRenderers: {
    'pricing-card': (data) => {
      const div = document.createElement('div');
      div.className = 'my-pricing-card';
      div.textContent = data.price;
      return div;
    }
  }
});
```

## API

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | string/Element | required | CSS selector or DOM element |
| `theme` | string | `'light'` | `'light'`, `'dark'`, or `'brand'` |
| `tokens` | object | `{}` | Override design tokens (fonts, spacing, etc.) |
| `colors` | object | `{}` | Override theme colors |
| `animate` | boolean | `true` | Enable section entrance animations |
| `staggerMs` | number | `80` | Stagger delay between section animations |
| `onAction` | function | `null` | Callback for CTA actions |
| `customRenderers` | object | `{}` | Custom component renderers |

### Methods

| Method | Description |
|--------|-------------|
| `render(pageData)` | Render a complete page from JSON |
| `renderStream(stream)` | Render from ReadableStream or async iterable |
| `renderFromResponse(response)` | Render from a fetch Response |
| `renderSimulated(pageData, delayMs)` | Simulate streaming (for demos) |
| `addSection(sectionData)` | Append a single section |
| `setTheme(name, colorOverrides?)` | Switch theme at runtime |
| `clear()` | Remove all rendered content |
| `destroy()` | Full cleanup (DOM + styles) |
| `toHTML()` | Export current page as standalone HTML string |

### Static

| Property/Method | Description |
|----------------|-------------|
| `AgentPages.componentTypes` | Array of available component type names |
| `AgentPages.iconNames` | Array of available icon names |
| `AgentPages.themes` | Array of available theme names |
| `AgentPages.getSystemPrompt()` | System prompt snippet for LLM integration |
| `AgentPages.getSchema()` | JSON Schema for page descriptions |

## Security Model

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
| Expressiveness | High (17 components + custom) | Medium (catalog-based) | Unlimited | Low |
| Security | Safe by construction | Safe by catalog | Dangerous | Safe |
| Dependencies | Zero | Framework renderer required | None | Varies |
| Streaming | Built-in | Built-in | Manual | N/A |
| Design consistency | Built-in design system | BYOC (bring your own components) | None | Rigid |
| Setup complexity | Script tag | Full stack integration | None | High |

## License

MIT
