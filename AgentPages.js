/*!
 * AgentPages v0.5.0
 * A runtime for AI agents to generate beautiful, consistent, secure web pages
 * from structured JSON descriptions. No raw HTML injection. No XSS.
 *
 * 0.5 highlights
 * - ARIA-complete tabset + keyboard navigation
 * - Form validation + structured submit/cancel action payloads
 * - Trusted Types friendly (no user-controlled HTML sinks; optional policy for static SVG)
 * - CSP nonce support for injected styles
 * - Safer DOM clearing + safer export (XMLSerializer)
 * - New layout primitives: card + stack (nested sections)
 *
 * MIT License.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AgentPages = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // -----------------------------
  // DESIGN TOKENS & THEMES
  // -----------------------------

  const DEFAULT_TOKENS = {
    // Typography
    fontHeading: 'DM Sans, Segoe UI, system-ui, sans-serif',
    fontBody: 'DM Sans, Segoe UI, system-ui, sans-serif',
    fontMono: 'JetBrains Mono, Fira Code, Consolas, monospace',

    sizeHero: '3rem',
    sizeH1: '2.25rem',
    sizeH2: '1.75rem',
    sizeH3: '1.35rem',
    sizeBody: '1rem',
    sizeSmall: '0.875rem',
    sizeCaption: '0.75rem',

    // Spacing
    space1: '0.25rem',
    space2: '0.5rem',
    space3: '0.75rem',
    space4: '1rem',
    space5: '1.5rem',
    space6: '2rem',
    space8: '3rem',
    space10: '4rem',
    space12: '5rem',

    // Radius
    radiusSm: '6px',
    radiusMd: '10px',
    radiusLg: '16px',
    radiusXl: '24px',
    radiusFull: '9999px',

    // Shadows
    shadowSm: '0 1px 3px rgba(0,0,0,0.08)',
    shadowMd: '0 4px 12px rgba(0,0,0,0.10)',
    shadowLg: '0 8px 30px rgba(0,0,0,0.12)',
    shadowXl: '0 16px 50px rgba(0,0,0,0.15)',

    // Transitions
    transitionFast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    transitionBase: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    transitionSlow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Line heights
    lineHeightTight: 1.2,
    lineHeightBase: 1.6,
    lineHeightLoose: 1.8,
  };

  const THEMES = {
    light: {
      colorBg: '#ffffff',
      colorBgSecondary: '#f8f9fb',
      colorBgTertiary: '#f0f2f5',
      colorBgAccent: '#eff6ff',
      colorText: '#1a1a2e',
      colorTextSecondary: '#5a5a7a',
      colorTextMuted: '#8a8aaa',
      colorPrimary: '#2563eb',
      colorPrimaryHover: '#1d4ed8',
      colorPrimaryText: '#ffffff',
      colorAccent: '#7c3aed',
      colorSuccess: '#059669',
      colorWarning: '#d97706',
      colorError: '#dc2626',
      colorBorder: '#e5e7eb',
      colorBorderLight: '#f0f0f5',
      colorCardBg: '#ffffff',
      colorCodeBg: '#1e293b',
      colorCodeText: '#e2e8f0',
    },
    dark: {
      colorBg: '#0f0f1a',
      colorBgSecondary: '#1a1a2e',
      colorBgTertiary: '#25253f',
      colorBgAccent: '#1e1b4b',
      colorText: '#f0f0f5',
      colorTextSecondary: '#a0a0c0',
      colorTextMuted: '#6a6a8a',
      colorPrimary: '#818cf8',
      colorPrimaryHover: '#6366f1',
      colorPrimaryText: '#0f0f1a',
      colorAccent: '#a78bfa',
      colorSuccess: '#34d399',
      colorWarning: '#fbbf24',
      colorError: '#f87171',
      colorBorder: '#2a2a4a',
      colorBorderLight: '#1f1f3a',
      colorCardBg: '#1a1a2e',
      colorCodeBg: '#0d0d1a',
      colorCodeText: '#e2e8f0',
    },
    brand: {
      colorBg: '#fafafa',
      colorBgSecondary: '#f5f0ff',
      colorBgTertiary: '#ede5ff',
      colorBgAccent: '#f0e6ff',
      colorText: '#1a0a3e',
      colorTextSecondary: '#5a3a8a',
      colorTextMuted: '#8a6aaa',
      colorPrimary: '#7c3aed',
      colorPrimaryHover: '#6d28d9',
      colorPrimaryText: '#ffffff',
      colorAccent: '#2563eb',
      colorSuccess: '#059669',
      colorWarning: '#d97706',
      colorError: '#dc2626',
      colorBorder: '#e0d4f5',
      colorBorderLight: '#f0e8ff',
      colorCardBg: '#ffffff',
      colorCodeBg: '#1e1035',
      colorCodeText: '#e8dff5',
    },
  };

  // -----------------------------
  // SAFETY LIMITS & SANITIZATION
  // -----------------------------

  const SAFETY_LIMITS = {
    maxSections: 60,
    maxDepth: 5,
    maxItemsPerList: 120,
    maxRowsPerTable: 200,
    maxFaqItems: 80,
    maxTabs: 20,
    maxFields: 60,
    maxOptionsPerSelect: 200,
    maxCharsPerField: 8000,
    maxActionName: 120,
    maxUrlLength: 2048,
  };

  function isPlainObject(x) {
    return !!x && typeof x === 'object' && Object.prototype.toString.call(x) === '[object Object]';
  }

  function clampString(str) {
    if (typeof str !== 'string') return '';
    if (str.length <= SAFETY_LIMITS.maxCharsPerField) return str;
    return str.slice(0, SAFETY_LIMITS.maxCharsPerField);
  }

  function sanitizeText(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = clampString(str);
    return div.textContent;
  }

  function sanitizeActionName(name) {
    if (typeof name !== 'string') return '';
    const s = name.trim().slice(0, SAFETY_LIMITS.maxActionName);
    // allow a conservative set; map others to underscore
    return s.replace(/[^a-zA-Z0-9:_\-./]/g, '_');
  }

  function safeId(raw, fallback) {
    const base = typeof raw === 'string' ? raw : '';
    const cleaned = base.trim().slice(0, 80).replace(/[^a-zA-Z0-9\-_:]/g, '-');
    return cleaned || fallback;
  }

  function sanitizeUrl(url) {
    if (typeof url !== 'string') return '';

    const trimmed = url.trim();
    if (!trimmed) return '';

    if (trimmed.length > SAFETY_LIMITS.maxUrlLength) {
      return '';
    }

    try {
      const parsed = new URL(trimmed, window.location.origin);
      const allowedProtocols = ['http:', 'https:', 'mailto:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return '';
      }
      return parsed.href;
    } catch (e) {
      return '';
    }
  }

  // -----------------------------
  // TRUSTED TYPES HELPERS (optional)
  // -----------------------------

  function createTrustedTypesPolicy(policyName) {
    try {
      if (typeof window === 'undefined') return null;
      const tt = window.trustedTypes;
      if (!tt || typeof tt.createPolicy !== 'function') return null;

      // If CSP restricts policy names, host must pass an allowed name.
      return tt.createPolicy(policyName || 'agentpages', {
        createHTML: (s) => String(s),
        createScriptURL: (s) => String(s),
        createScript: (s) => String(s),
      });
    } catch (e) {
      return null;
    }
  }

  // -----------------------------
  // ICONS (static SVG path markup)
  // Note: injected via Trusted Types policy when available.
  // -----------------------------

  const ICONS = {
    check: '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2" />',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2" />',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />',
    globe: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="currentColor" stroke-width="2" />',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" /><path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" fill="none" stroke="currentColor" stroke-width="2" />',
    chart: '<path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2" /><circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" stroke-width="2" />',
    clock: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" /><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />',
    target: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" /><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2" /><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="2" />',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" fill="none" stroke="currentColor" stroke-width="2" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" fill="none" stroke="currentColor" stroke-width="2" />',
    code: '<polyline points="16 18 22 12 16 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><polyline points="8 6 2 12 8 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke="currentColor" stroke-width="2" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M21 5v14c0 1.66-4 3-9 3s-9-1.34-9-3V5" fill="none" stroke="currentColor" stroke-width="2" />',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="currentColor" stroke-width="2" /><polyline points="22,6 12,13 2,6" fill="none" stroke="currentColor" stroke-width="2" />',
    settings: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2" />',
    info: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" /><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" /><line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" />',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke="currentColor" stroke-width="2" /><line x1="12" y1="19" x2="12" y2="19" stroke="currentColor" stroke-width="2" /><line x1="12" y1="11" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" />',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="currentColor" stroke-width="2" /><polyline points="7 10 12 15 17 10" fill="none" stroke="currentColor" stroke-width="2" /><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" />',
    play: '<polygon points="5 3 19 12 5 21 5 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" stroke-width="2" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="2" />',
    chevronDown: '<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2" />',
  };

  function renderIcon(name, size, ttPolicy) {
    const svgContent = ICONS[name] || ICONS.info;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(size || 20));
    svg.setAttribute('height', String(size || 20));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');

    // Static markup only. If Trusted Types is enforced, use policy to satisfy sinks.
    // This avoids using user-provided HTML completely.
    try {
      if (ttPolicy && typeof ttPolicy.createHTML === 'function') {
        svg.innerHTML = ttPolicy.createHTML(svgContent);
      } else {
        svg.innerHTML = svgContent;
      }
    } catch (e) {
      // Fallback: no icon
    }

    return svg;
  }

  // -----------------------------
  // UTILITIES & CSS GENERATION
  // -----------------------------

  function el(tag, attrs, children) {
    const node = document.createElement(tag);

    if (attrs && typeof attrs === 'object') {
      Object.entries(attrs).forEach(([key, val]) => {
        if (val === undefined || val === null) return;

        if (key === 'style' && val && typeof val === 'object') {
          Object.assign(node.style, val);
        } else if (key === 'className') {
          node.className = String(val);
        } else if (key === 'dataset' && val && typeof val === 'object') {
          Object.entries(val).forEach(([dk, dv]) => {
            if (dv === undefined || dv === null) return;
            node.dataset[dk] = String(dv);
          });
        } else if (key.startsWith('on') && typeof val === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), val);
        } else if (key === 'textContent') {
          node.textContent = String(val);
        } else {
          node.setAttribute(key, String(val));
        }
      });
    }

    if (children !== undefined && children !== null) {
      if (Array.isArray(children)) {
        children.forEach((child) => {
          if (child instanceof Node) {
            node.appendChild(child);
          } else if (typeof child === 'string') {
            node.appendChild(document.createTextNode(child));
          }
        });
      } else if (children instanceof Node) {
        node.appendChild(children);
      } else if (typeof children === 'string') {
        node.textContent = children;
      }
    }

    return node;
  }

  function clearNode(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function generateCSS(tokens, themeColors, containerId) {
    const c = `#${containerId}`;

    return `
${c} {
  font-family: var(--ap-font-body);
  font-size: var(--ap-size-body);
  line-height: ${tokens.lineHeightBase};
  color: var(--ap-color-text);
  background: var(--ap-color-bg);
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

${c}, ${c} *, ${c} *::before, ${c} *::after {
  box-sizing: border-box;
}

${c} {
  --ap-font-heading: ${tokens.fontHeading};
  --ap-font-body: ${tokens.fontBody};
  --ap-font-mono: ${tokens.fontMono};

  --ap-size-hero: ${tokens.sizeHero};
  --ap-size-h1: ${tokens.sizeH1};
  --ap-size-h2: ${tokens.sizeH2};
  --ap-size-h3: ${tokens.sizeH3};
  --ap-size-body: ${tokens.sizeBody};
  --ap-size-small: ${tokens.sizeSmall};
  --ap-size-caption: ${tokens.sizeCaption};

  --ap-radius-sm: ${tokens.radiusSm};
  --ap-radius-md: ${tokens.radiusMd};
  --ap-radius-lg: ${tokens.radiusLg};
  --ap-radius-xl: ${tokens.radiusXl};
  --ap-radius-full: ${tokens.radiusFull};

  --ap-shadow-sm: ${tokens.shadowSm};
  --ap-shadow-md: ${tokens.shadowMd};
  --ap-shadow-lg: ${tokens.shadowLg};
  --ap-shadow-xl: ${tokens.shadowXl};

  --ap-color-bg: ${themeColors.colorBg};
  --ap-color-bg-secondary: ${themeColors.colorBgSecondary};
  --ap-color-bg-tertiary: ${themeColors.colorBgTertiary};
  --ap-color-bg-accent: ${themeColors.colorBgAccent};
  --ap-color-text: ${themeColors.colorText};
  --ap-color-text-secondary: ${themeColors.colorTextSecondary};
  --ap-color-text-muted: ${themeColors.colorTextMuted};
  --ap-color-primary: ${themeColors.colorPrimary};
  --ap-color-primary-hover: ${themeColors.colorPrimaryHover};
  --ap-color-primary-text: ${themeColors.colorPrimaryText};
  --ap-color-accent: ${themeColors.colorAccent};
  --ap-color-success: ${themeColors.colorSuccess};
  --ap-color-warning: ${themeColors.colorWarning};
  --ap-color-error: ${themeColors.colorError};
  --ap-color-border: ${themeColors.colorBorder};
  --ap-color-border-light: ${themeColors.colorBorderLight};
  --ap-color-card-bg: ${themeColors.colorCardBg};
  --ap-color-code-bg: ${themeColors.colorCodeBg};
  --ap-color-code-text: ${themeColors.colorCodeText};
}

/* Animation */
${c} .ap-animate-in {
  animation: apFadeSlideIn ${tokens.transitionSlow} both;
}

@keyframes apFadeSlideIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Section wrapper */
${c} .ap-section {
  padding: ${tokens.space8} ${tokens.space6};
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}

${c} .ap-section--wide { max-width: 1120px; }

${c} .ap-section--full {
  max-width: 100%;
  padding-left: ${tokens.space4};
  padding-right: ${tokens.space4};
}

/* Hero */
${c} .ap-hero {
  text-align: center;
  padding: ${tokens.space12} ${tokens.space6};
}

${c} .ap-hero-label {
  display: inline-block;
  font-size: var(--ap-size-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ap-color-primary);
  background: var(--ap-color-bg-accent);
  padding: ${tokens.space1} ${tokens.space3};
  border-radius: var(--ap-radius-full);
  margin-bottom: ${tokens.space4};
}

${c} .ap-hero-heading {
  font-family: var(--ap-font-heading);
  font-size: var(--ap-size-hero);
  font-weight: 700;
  line-height: ${tokens.lineHeightTight};
  color: var(--ap-color-text);
  margin-bottom: ${tokens.space4};
  letter-spacing: -0.02em;
}

${c} .ap-hero-subheading {
  font-size: 1.1rem;
  color: var(--ap-color-text-secondary);
  max-width: 640px;
  margin: 0 auto ${tokens.space6};
  line-height: ${tokens.lineHeightLoose};
}

/* Heading */
${c} .ap-heading {
  font-family: var(--ap-font-heading);
  font-weight: 700;
  line-height: ${tokens.lineHeightTight};
  color: var(--ap-color-text);
  letter-spacing: -0.01em;
}

${c} .ap-heading--1 { font-size: var(--ap-size-h1); }
${c} .ap-heading--2 { font-size: var(--ap-size-h2); }
${c} .ap-heading--3 { font-size: var(--ap-size-h3); }

/* Text */
${c} .ap-text {
  color: var(--ap-color-text-secondary);
  line-height: ${tokens.lineHeightBase};
  max-width: 720px;
}

${c} .ap-text--centered {
  text-align: center;
  margin-left: auto;
  margin-right: auto;
}

/* Layout primitives */
${c} .ap-card {
  background: var(--ap-color-card-bg);
  border: 1px solid var(--ap-color-border-light);
  border-radius: var(--ap-radius-xl);
  padding: ${tokens.space6};
  box-shadow: var(--ap-shadow-sm);
}

${c} .ap-card--accent {
  background: var(--ap-color-bg-accent);
  border-color: var(--ap-color-border);
}

${c} .ap-stack {
  display: flex;
  flex-direction: column;
}

/* Feature grid */
${c} .ap-feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: ${tokens.space5};
}

${c} .ap-feature-card {
  background: var(--ap-color-card-bg);
  border: 1px solid var(--ap-color-border-light);
  border-radius: var(--ap-radius-lg);
  padding: ${tokens.space6};
  transition: box-shadow ${tokens.transitionBase}, transform ${tokens.transitionBase};
}

${c} .ap-feature-card:hover {
  box-shadow: var(--ap-shadow-md);
  transform: translateY(-2px);
}

${c} .ap-feature-card-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ap-color-bg-accent);
  color: var(--ap-color-primary);
  border-radius: var(--ap-radius-md);
  margin-bottom: ${tokens.space4};
}

${c} .ap-feature-card-title {
  font-family: var(--ap-font-heading);
  font-weight: 600;
  font-size: var(--ap-size-body);
  color: var(--ap-color-text);
  margin-bottom: ${tokens.space2};
}

${c} .ap-feature-card-body {
  font-size: var(--ap-size-small);
  color: var(--ap-color-text-secondary);
  line-height: ${tokens.lineHeightBase};
}

/* Stat row */
${c} .ap-stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${tokens.space5};
  text-align: center;
}

${c} .ap-stat-item { padding: ${tokens.space5}; }

${c} .ap-stat-item-value {
  font-family: var(--ap-font-heading);
  font-size: var(--ap-size-h1);
  font-weight: 700;
  color: var(--ap-color-primary);
  line-height: 1;
  margin-bottom: ${tokens.space2};
}

${c} .ap-stat-item-label {
  font-size: var(--ap-size-small);
  color: var(--ap-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

/* Table */
${c} .ap-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

${c} .ap-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--ap-size-small);
}

${c} .ap-table th {
  font-family: var(--ap-font-heading);
  font-weight: 600;
  text-align: left;
  padding: ${tokens.space3} ${tokens.space4};
  background: var(--ap-color-bg-secondary);
  color: var(--ap-color-text);
  border-bottom: 2px solid var(--ap-color-border);
  white-space: nowrap;
}

${c} .ap-table td {
  padding: ${tokens.space3} ${tokens.space4};
  border-bottom: 1px solid var(--ap-color-border-light);
  color: var(--ap-color-text-secondary);
  vertical-align: top;
}

${c} .ap-table tr:last-child td { border-bottom: none; }
${c} .ap-table-check { color: var(--ap-color-success); }
${c} .ap-table-cross { color: var(--ap-color-error); }

/* Steps */
${c} .ap-steps {
  display: flex;
  flex-direction: column;
  gap: ${tokens.space5};
}

${c} .ap-step {
  display: flex;
  gap: ${tokens.space4};
  align-items: flex-start;
}

${c} .ap-step-number {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ap-color-primary);
  color: var(--ap-color-primary-text);
  border-radius: var(--ap-radius-full);
  font-weight: 700;
  font-size: var(--ap-size-small);
  font-family: var(--ap-font-heading);
}

${c} .ap-step-title {
  font-family: var(--ap-font-heading);
  font-weight: 600;
  color: var(--ap-color-text);
  margin-bottom: ${tokens.space1};
}

${c} .ap-step-body {
  font-size: var(--ap-size-small);
  color: var(--ap-color-text-secondary);
  line-height: ${tokens.lineHeightBase};
}

/* Callout */
${c} .ap-callout {
  border-radius: var(--ap-radius-lg);
  padding: ${tokens.space5};
  display: flex;
  gap: ${tokens.space4};
  align-items: flex-start;
}

${c} .ap-callout--info {
  background: var(--ap-color-bg-accent);
  border-left: 4px solid var(--ap-color-primary);
}

${c} .ap-callout--success {
  background: rgba(5, 150, 105, 0.08);
  border-left: 4px solid var(--ap-color-success);
}

${c} .ap-callout--warning {
  background: rgba(217, 119, 6, 0.08);
  border-left: 4px solid var(--ap-color-warning);
}

${c} .ap-callout--error {
  background: rgba(220, 38, 38, 0.08);
  border-left: 4px solid var(--ap-color-error);
}

${c} .ap-callout-icon { flex-shrink: 0; margin-top: 2px; }

${c} .ap-callout-title {
  font-family: var(--ap-font-heading);
  font-weight: 600;
  color: var(--ap-color-text);
  margin-bottom: ${tokens.space1};
}

${c} .ap-callout-body {
  font-size: var(--ap-size-small);
  color: var(--ap-color-text-secondary);
  line-height: ${tokens.lineHeightBase};
}

/* FAQ */
${c} .ap-faq {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--ap-color-border-light);
  border-radius: var(--ap-radius-lg);
  overflow: hidden;
}

${c} .ap-faq-item { border-bottom: 1px solid var(--ap-color-border-light); }
${c} .ap-faq-item:last-child { border-bottom: none; }

${c} .ap-faq-item-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: none;
  border: none;
  padding: ${tokens.space4} ${tokens.space5};
  font-family: var(--ap-font-heading);
  font-weight: 600;
  font-size: var(--ap-size-body);
  color: var(--ap-color-text);
  cursor: pointer;
  text-align: left;
  transition: background ${tokens.transitionFast};
}

${c} .ap-faq-item-q:hover { background: var(--ap-color-bg-secondary); }

${c} .ap-faq-item-chevron {
  transition: transform ${tokens.transitionBase};
  flex-shrink: 0;
  margin-left: ${tokens.space4};
}

${c} .ap-faq-item--open .ap-faq-item-chevron { transform: rotate(180deg); }

${c} .ap-faq-item-a {
  max-height: 0;
  overflow: hidden;
  transition: max-height ${tokens.transitionBase}, padding ${tokens.transitionBase};
}

${c} .ap-faq-item--open .ap-faq-item-a {
  max-height: 600px;
  padding: 0 ${tokens.space5} ${tokens.space5};
}

${c} .ap-faq-item-a-text {
  font-size: var(--ap-size-small);
  color: var(--ap-color-text-secondary);
  line-height: ${tokens.lineHeightBase};
}

/* Quote */
${c} .ap-quote {
  border-left: 3px solid var(--ap-color-primary);
  padding: ${tokens.space4} ${tokens.space5};
  background: var(--ap-color-bg-secondary);
  border-radius: 0 var(--ap-radius-md) var(--ap-radius-md) 0;
}

${c} .ap-quote-text {
  font-size: 1.1rem;
  color: var(--ap-color-text);
  font-style: italic;
  line-height: ${tokens.lineHeightBase};
  margin-bottom: ${tokens.space3};
}

${c} .ap-quote-author {
  font-size: var(--ap-size-small);
  color: var(--ap-color-text-muted);
  font-weight: 500;
}

/* List */
${c} .ap-list {
  display: flex;
  flex-direction: column;
  gap: ${tokens.space3};
}

${c} .ap-list-item {
  display: flex;
  gap: ${tokens.space3};
  align-items: flex-start;
}

${c} .ap-list-item-marker {
  flex-shrink: 0;
  color: var(--ap-color-primary);
  margin-top: 3px;
}

${c} .ap-list-item-text {
  color: var(--ap-color-text-secondary);
  font-size: var(--ap-size-body);
  line-height: ${tokens.lineHeightBase};
}

/* Code block */
${c} .ap-code {
  background: var(--ap-color-code-bg);
  color: var(--ap-color-code-text);
  border-radius: var(--ap-radius-lg);
  overflow: hidden;
}

${c} .ap-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${tokens.space3} ${tokens.space4};
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

${c} .ap-code-lang {
  font-size: var(--ap-size-caption);
  color: var(--ap-color-code-text);
  opacity: 0.7;
  font-family: var(--ap-font-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

${c} .ap-code-copy {
  display: inline-flex;
  align-items: center;
  gap: ${tokens.space2};
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--ap-color-code-text);
  padding: ${tokens.space2} ${tokens.space3};
  border-radius: var(--ap-radius-md);
  cursor: pointer;
  font-size: var(--ap-size-caption);
}

${c} .ap-code-copy:hover { background: rgba(255,255,255,0.16); }

${c} .ap-code-body {
  padding: ${tokens.space4};
  overflow-x: auto;
  font-family: var(--ap-font-mono);
  font-size: var(--ap-size-small);
  line-height: 1.7;
  white-space: pre;
  tab-size: 2;
}

/* CTA */
${c} .ap-cta {
  text-align: center;
  padding: ${tokens.space8} ${tokens.space6};
}

${c} .ap-cta-heading {
  font-family: var(--ap-font-heading);
  font-size: var(--ap-size-h2);
  font-weight: 700;
  color: var(--ap-color-text);
  margin-bottom: ${tokens.space3};
}

${c} .ap-cta-body {
  color: var(--ap-color-text-secondary);
  margin-bottom: ${tokens.space5};
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

${c} .ap-btn {
  display: inline-flex;
  align-items: center;
  gap: ${tokens.space2};
  padding: ${tokens.space3} ${tokens.space5};
  font-family: var(--ap-font-heading);
  font-weight: 600;
  font-size: var(--ap-size-body);
  border-radius: var(--ap-radius-md);
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all ${tokens.transitionFast};
}

${c} .ap-btn--primary {
  background: var(--ap-color-primary);
  color: var(--ap-color-primary-text);
}

${c} .ap-btn--primary:hover {
  background: var(--ap-color-primary-hover);
  box-shadow: var(--ap-shadow-md);
}

${c} .ap-btn--secondary {
  background: transparent;
  color: var(--ap-color-primary);
  border: 1.5px solid var(--ap-color-primary);
}

${c} .ap-btn--secondary:hover { background: var(--ap-color-bg-accent); }

/* Divider */
${c} .ap-divider {
  border: none;
  height: 1px;
  background: var(--ap-color-border-light);
  margin: ${tokens.space4} auto;
  max-width: 960px;
}

/* Columns */
${c} .ap-columns {
  display: grid;
  gap: ${tokens.space5};
}

${c} .ap-columns--2 { grid-template-columns: repeat(2, 1fr); }
${c} .ap-columns--3 { grid-template-columns: repeat(3, 1fr); }
${c} .ap-columns--4 { grid-template-columns: repeat(4, 1fr); }

/* Image text / media block base */
${c} .ap-image-text,
${c} .ap-media-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${tokens.space6};
  align-items: center;
}

${c} .ap-image-text-image,
${c} .ap-media-block-media {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--ap-color-bg-secondary);
  border-radius: var(--ap-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ap-color-text-muted);
  font-size: var(--ap-size-small);
  overflow: hidden;
}

${c} .ap-image-text-image img,
${c} .ap-media-block-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

${c} .ap-image-text-title,
${c} .ap-media-block-title {
  font-family: var(--ap-font-heading);
  font-size: var(--ap-size-h2);
  font-weight: 700;
  color: var(--ap-color-text);
  margin-bottom: ${tokens.space3};
}

${c} .ap-image-text-body,
${c} .ap-media-block-body {
  color: var(--ap-color-text-secondary);
  line-height: ${tokens.lineHeightBase};
}

/* Timeline */
${c} .ap-timeline { position: relative; padding-left: 32px; }

${c} .ap-timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--ap-color-border);
}

${c} .ap-timeline-item { position: relative; padding-bottom: ${tokens.space5}; }
${c} .ap-timeline-item:last-child { padding-bottom: 0; }

${c} .ap-timeline-item-dot {
  position: absolute;
  left: -28px;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--ap-color-primary);
  border: 2px solid var(--ap-color-bg);
  box-shadow: 0 0 0 3px var(--ap-color-bg-accent);
}

${c} .ap-timeline-item-date {
  font-size: var(--ap-size-caption);
  color: var(--ap-color-text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${tokens.space1};
}

${c} .ap-timeline-item-title {
  font-family: var(--ap-font-heading);
  font-weight: 600;
  color: var(--ap-color-text);
  margin-bottom: ${tokens.space1};
}

${c} .ap-timeline-item-body {
  font-size: var(--ap-size-small);
  color: var(--ap-color-text-secondary);
  line-height: ${tokens.lineHeightBase};
}

/* Tabset */
${c} .ap-tabset-header { margin-bottom: ${tokens.space4}; }

${c} .ap-tabset-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: ${tokens.space2};
  padding: ${tokens.space1};
  background: var(--ap-color-bg-secondary);
  border-radius: var(--ap-radius-full);
}

${c} .ap-tabset-tab {
  border: none;
  background: transparent;
  padding: ${tokens.space2} ${tokens.space4};
  border-radius: var(--ap-radius-full);
  font-size: var(--ap-size-small);
  font-weight: 500;
  color: var(--ap-color-text-secondary);
  cursor: pointer;
  transition: background ${tokens.transitionFast}, color ${tokens.transitionFast};
}

${c} .ap-tabset-tab:focus { outline: 2px solid var(--ap-color-primary); outline-offset: 2px; }

${c} .ap-tabset-tab--active {
  background: var(--ap-color-bg);
  color: var(--ap-color-text);
  box-shadow: var(--ap-shadow-sm);
}

${c} .ap-tabset-panels { margin-top: ${tokens.space5}; }

/* Form */
${c} .ap-form { max-width: 640px; margin: 0 auto; }

${c} .ap-form-fields {
  display: flex;
  flex-direction: column;
  gap: ${tokens.space4};
  margin-top: ${tokens.space4};
  margin-bottom: ${tokens.space5};
}

${c} .ap-form-field-label {
  display: block;
  font-size: var(--ap-size-small);
  font-weight: 600;
  color: var(--ap-color-text);
  margin-bottom: ${tokens.space1};
}

${c} .ap-form-field-input,
${c} .ap-form-field-textarea,
${c} .ap-form-field-select {
  width: 100%;
  padding: ${tokens.space3};
  border-radius: var(--ap-radius-md);
  border: 1px solid var(--ap-color-border-light);
  background: var(--ap-color-bg);
  color: var(--ap-color-text);
  font-family: inherit;
  font-size: var(--ap-size-body);
}

${c} .ap-form-field-input:focus,
${c} .ap-form-field-textarea:focus,
${c} .ap-form-field-select:focus {
  outline: 2px solid var(--ap-color-primary);
  outline-offset: 2px;
}

${c} .ap-form-field-help {
  margin-top: ${tokens.space1};
  font-size: var(--ap-size-caption);
  color: var(--ap-color-text-muted);
}

${c} .ap-form-field-error {
  margin-top: ${tokens.space1};
  font-size: var(--ap-size-caption);
  color: var(--ap-color-error);
}

${c} .ap-form-field-row { display: flex; align-items: center; gap: ${tokens.space2}; }

${c} .ap-form-actions { display: flex; flex-wrap: wrap; gap: ${tokens.space3}; }

/* Spacing utilities */
${c} .ap-mt-0 { margin-top: 0; }
${c} .ap-mt-2 { margin-top: ${tokens.space2}; }
${c} .ap-mt-4 { margin-top: ${tokens.space4}; }
${c} .ap-mt-6 { margin-top: ${tokens.space6}; }
${c} .ap-mb-0 { margin-bottom: 0; }
${c} .ap-mb-2 { margin-bottom: ${tokens.space2}; }
${c} .ap-mb-4 { margin-bottom: ${tokens.space4}; }
${c} .ap-mb-6 { margin-bottom: ${tokens.space6}; }

/* Responsive tweaks */
@media (max-width: 768px) {
  ${c} .ap-hero-heading { font-size: 2rem; }
  ${c} .ap-section { padding: ${tokens.space6} ${tokens.space4}; }
  ${c} .ap-feature-grid { grid-template-columns: 1fr; }
  ${c} .ap-columns--2,
  ${c} .ap-columns--3,
  ${c} .ap-columns--4 { grid-template-columns: 1fr; }
  ${c} .ap-image-text,
  ${c} .ap-media-block { grid-template-columns: 1fr; }
}
`;
  }

  // -----------------------------
  // COMPONENT RENDERERS
  // -----------------------------

  const RENDERERS = {};

  function normalizeAlign(align) {
    return align === 'center' ? 'center' : 'left';
  }

  RENDERERS.hero = function (data, ctx) {
    const section = el('div', { className: 'ap-hero ap-section' });

    if (data.label) {
      section.appendChild(el('div', { className: 'ap-hero-label' }, sanitizeText(data.label)));
    }

    if (data.heading) {
      section.appendChild(el('h1', { className: 'ap-hero-heading' }, sanitizeText(data.heading)));
    }

    if (data.subheading) {
      section.appendChild(el('p', { className: 'ap-hero-subheading' }, sanitizeText(data.subheading)));
    }

    if (data.cta && data.cta.text) {
      const btn = el(
        'a',
        {
          className: 'ap-btn ap-btn--primary',
          href: data.cta.url ? sanitizeUrl(data.cta.url) : '#',
          dataset: data.cta.action ? { action: sanitizeActionName(data.cta.action) } : {},
        },
        sanitizeText(data.cta.text)
      );
      section.appendChild(btn);
    }

    return section;
  };

  RENDERERS.heading = function (data) {
    const level = Math.min(Math.max(data.level || 2, 1), 3);
    const tag = 'h' + level;
    return el(tag, { className: 'ap-heading ap-heading--' + level + ' ap-section' }, sanitizeText(data.text || ''));
  };

  RENDERERS.text = function (data) {
    const classes = ['ap-text', 'ap-section'];
    if (normalizeAlign(data.align) === 'center') classes.push('ap-text--centered');
    return el('p', { className: classes.join(' ') }, sanitizeText(data.text || ''));
  };

  // New: stack
  RENDERERS.stack = function (data, renderSection) {
    const wrap = el('div', { className: 'ap-section' });
    const gap = Math.min(Math.max(Number(data.gap || 4), 0), 12);
    const stack = el('div', { className: 'ap-stack' });
    stack.style.gap = 'var(--ap-space-' + gap + ')';
    // var not defined; map gap using tokens below
    // safer: compute via tokens in ctx not available here; fallback using rem scale
    stack.style.gap = (gap * 0.25) + 'rem';

    if (Array.isArray(data.sections)) {
      data.sections.forEach((s) => {
        const rendered = renderSection(s);
        if (rendered) {
          rendered.classList.remove('ap-section');
          rendered.style.padding = '0';
          stack.appendChild(rendered);
        }
      });
    }

    wrap.appendChild(stack);
    return wrap;
  };

  // New: card (nested)
  RENDERERS.card = function (data, renderSection) {
    const wrap = el('div', { className: 'ap-section' });
    const variant = data.variant === 'accent' ? 'accent' : 'default';
    const card = el('div', { className: 'ap-card' + (variant === 'accent' ? ' ap-card--accent' : '') });

    if (data.heading) {
      card.appendChild(el('h3', { className: 'ap-heading ap-heading--3 ap-mb-2' }, sanitizeText(data.heading)));
    }
    if (data.body) {
      card.appendChild(el('p', { className: 'ap-text ap-mb-4' }, sanitizeText(data.body)));
    }

    if (Array.isArray(data.sections)) {
      data.sections.forEach((s) => {
        const rendered = renderSection(s);
        if (rendered) {
          rendered.classList.remove('ap-section');
          rendered.style.padding = '0';
          card.appendChild(rendered);
        }
      });
    }

    wrap.appendChild(card);
    return wrap;
  };

  RENDERERS['feature-grid'] = function (data, ctx) {
    const wrap = el('div', { className: 'ap-section' });

    if (data.heading) {
      const h = el('h2', { className: 'ap-heading ap-heading--2 ap-mb-6' }, sanitizeText(data.heading));
      if (normalizeAlign(data.align) === 'center') h.style.textAlign = 'center';
      wrap.appendChild(h);
    }

    if (data.subheading) {
      wrap.appendChild(el('p', { className: 'ap-text ap-text--centered ap-mb-6' }, sanitizeText(data.subheading)));
    }

    const grid = el('div', { className: 'ap-feature-grid' });

    (data.items || []).forEach((item) => {
      const card = el('div', { className: 'ap-feature-card' });
      if (item.icon) {
        const iconWrap = el('div', { className: 'ap-feature-card-icon' });
        iconWrap.appendChild(renderIcon(item.icon, 22, ctx.ttPolicy));
        card.appendChild(iconWrap);
      }
      card.appendChild(el('div', { className: 'ap-feature-card-title' }, sanitizeText(item.title || '')));
      if (item.body) {
        card.appendChild(el('div', { className: 'ap-feature-card-body' }, sanitizeText(item.body)));
      }
      grid.appendChild(card);
    });

    wrap.appendChild(grid);
    return wrap;
  };

  RENDERERS['stat-row'] = function (data) {
    const wrap = el('div', { className: 'ap-section' });

    if (data.heading) {
      const h = el('h2', { className: 'ap-heading ap-heading--2 ap-mb-6' }, sanitizeText(data.heading));
      h.style.textAlign = 'center';
      wrap.appendChild(h);
    }

    const row = el('div', { className: 'ap-stat-row' });

    (data.items || []).forEach((item) => {
      const stat = el('div', { className: 'ap-stat-item' });
      stat.appendChild(el('div', { className: 'ap-stat-item-value' }, sanitizeText(item.value || '')));
      stat.appendChild(el('div', { className: 'ap-stat-item-label' }, sanitizeText(item.label || '')));
      row.appendChild(stat);
    });

    wrap.appendChild(row);
    return wrap;
  };

  RENDERERS['comparison-table'] = function (data, ctx) {
    const wrap = el('div', { className: 'ap-section' });

    if (data.heading) {
      wrap.appendChild(el('h2', { className: 'ap-heading ap-heading--2 ap-mb-6' }, sanitizeText(data.heading)));
    }

    const tableWrap = el('div', { className: 'ap-table-wrap' });
    const table = el('table', { className: 'ap-table' });

    if (Array.isArray(data.columns)) {
      const thead = el('thead');
      const tr = el('tr');
      data.columns.forEach((col) => {
        tr.appendChild(el('th', null, sanitizeText(String(col))));
      });
      thead.appendChild(tr);
      table.appendChild(thead);
    }

    if (Array.isArray(data.rows)) {
      const tbody = el('tbody');
      data.rows.forEach((row) => {
        const tr = el('tr');
        const cells = Array.isArray(row) ? row : Object.values(row);
        cells.forEach((cell) => {
          const td = el('td');
          const str = String(cell);

          if (str === 'true' || str === '✔') {
            td.className = 'ap-table-check';
            td.appendChild(renderIcon('check', 18, ctx.ttPolicy));
          } else if (str === 'false' || str === '✘') {
            td.className = 'ap-table-cross';
            td.textContent = '✘';
          } else {
            td.textContent = sanitizeText(str);
          }

          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }

    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    return wrap;
  };

  RENDERERS.steps = function (data) {
    const wrap = el('div', { className: 'ap-section' });

    if (data.heading) {
      wrap.appendChild(el('h2', { className: 'ap-heading ap-heading--2 ap-mb-6' }, sanitizeText(data.heading)));
    }

    const steps = el('div', { className: 'ap-steps' });

    (data.items || []).forEach((item, i) => {
      const step = el('div', { className: 'ap-step' });
      step.appendChild(el('div', { className: 'ap-step-number' }, String(i + 1)));
      const content = el('div', { className: 'ap-step-content' });
      content.appendChild(el('div', { className: 'ap-step-title' }, sanitizeText(item.title || '')));
      if (item.body) {
        content.appendChild(el('div', { className: 'ap-step-body' }, sanitizeText(item.body || '')));
      }
      step.appendChild(content);
      steps.appendChild(step);
    });

    wrap.appendChild(steps);
    return wrap;
  };

  RENDERERS.callout = function (data, ctx) {
    const allowed = ['info', 'success', 'warning', 'error'];
    const variant = allowed.includes(data.variant) ? data.variant : 'info';
    const iconMap = { info: 'info', success: 'check', warning: 'alert', error: 'alert' };

    const wrap = el('div', { className: 'ap-section' });
    const callout = el('div', { className: 'ap-callout ap-callout--' + variant });

    if (variant === 'error') callout.setAttribute('role', 'alert');

    const iconWrap = el('div', { className: 'ap-callout-icon' });
    iconWrap.appendChild(renderIcon(iconMap[variant], 20, ctx.ttPolicy));
    callout.appendChild(iconWrap);

    const body = el('div');
    if (data.title) {
      body.appendChild(el('div', { className: 'ap-callout-title' }, sanitizeText(data.title)));
    }
    if (data.text || data.body) {
      body.appendChild(el('div', { className: 'ap-callout-body' }, sanitizeText(data.text || data.body || '')));
    }
    callout.appendChild(body);
    wrap.appendChild(callout);
    return wrap;
  };

  RENDERERS.faq = function (data, ctx) {
    const wrap = el('div', { className: 'ap-section' });

    if (data.heading) {
      const h = el('h2', { className: 'ap-heading ap-heading--2 ap-mb-6' }, sanitizeText(data.heading));
      if (normalizeAlign(data.align) === 'center') h.style.textAlign = 'center';
      wrap.appendChild(h);
    }

    const faq = el('div', { className: 'ap-faq' });

    (data.items || []).forEach((item, index) => {
      const faqItem = el('div', { className: 'ap-faq-item' });

      const qId = safeId(item.id, 'faq-q-' + index);
      const aId = safeId(item.id, 'faq-a-' + index);

      const qBtn = el('button', {
        className: 'ap-faq-item-q',
        type: 'button',
        id: qId,
        'aria-expanded': 'false',
        'aria-controls': aId,
      });
      qBtn.appendChild(document.createTextNode(sanitizeText(item.question || '')));

      const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chevron.setAttribute('width', '16');
      chevron.setAttribute('height', '16');
      chevron.setAttribute('viewBox', '0 0 24 24');
      chevron.setAttribute('fill', 'none');
      chevron.setAttribute('class', 'ap-faq-item-chevron');
      try {
        if (ctx.ttPolicy && typeof ctx.ttPolicy.createHTML === 'function') {
          chevron.innerHTML = ctx.ttPolicy.createHTML(ICONS.chevronDown);
        } else {
          chevron.innerHTML = ICONS.chevronDown;
        }
      } catch (e) {}
      qBtn.appendChild(chevron);

      qBtn.addEventListener('click', function () {
        const isOpen = faqItem.classList.toggle('ap-faq-item--open');
        qBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      faqItem.appendChild(qBtn);

      const aWrap = el('div', { className: 'ap-faq-item-a', id: aId, role: 'region', 'aria-labelledby': qId });
      aWrap.appendChild(el('div', { className: 'ap-faq-item-a-text' }, sanitizeText(item.answer || '')));
      faqItem.appendChild(aWrap);

      faq.appendChild(faqItem);
    });

    wrap.appendChild(faq);
    return wrap;
  };

  RENDERERS.quote = function (data) {
    const wrap = el('div', { className: 'ap-section' });
    const quote = el('blockquote', { className: 'ap-quote' });

    quote.appendChild(el('div', { className: 'ap-quote-text' }, sanitizeText(data.text || '')));

    if (data.author) {
      quote.appendChild(el('div', { className: 'ap-quote-author' }, sanitizeText(data.author || '')));
    }

    wrap.appendChild(quote);
    return wrap;
  };

  RENDERERS.list = function (data, ctx) {
    const wrap = el('div', { className: 'ap-section' });

    if (data.heading) {
      wrap.appendChild(el('h2', { className: 'ap-heading ap-heading--2 ap-mb-4' }, sanitizeText(data.heading)));
    }

    const list = el('div', { className: 'ap-list' });
    const ordered = !!data.ordered;

    (data.items || []).forEach((item, i) => {
      const li = el('div', { className: 'ap-list-item' });
      const marker = el('div', { className: 'ap-list-item-marker' });

      if (ordered) {
        marker.textContent = String(i + 1) + '.';
        marker.style.fontWeight = '600';
        marker.style.minWidth = '20px';
      } else {
        marker.appendChild(renderIcon('check', 16, ctx.ttPolicy));
      }

      li.appendChild(marker);

      const textVal = typeof item === 'string' ? item : item && item.text ? item.text : '';
      li.appendChild(el('div', { className: 'ap-list-item-text' }, sanitizeText(textVal)));

      list.appendChild(li);
    });

    wrap.appendChild(list);
    return wrap;
  };

  RENDERERS.code = function (data, ctx) {
    const wrap = el('div', { className: 'ap-section' });
    const codeBlock = el('div', { className: 'ap-code' });

    const header = el('div', { className: 'ap-code-header' });

    header.appendChild(el('span', { className: 'ap-code-lang' }, sanitizeText(data.language || 'CODE')));

    const copyBtn = el(
      'button',
      {
        type: 'button',
        className: 'ap-code-copy',
        dataset: { action: 'code:copy' },
        'aria-label': 'Copy code to clipboard',
      },
      [renderIcon('copy', 16, ctx.ttPolicy), 'Copy']
    );

    const codeText = sanitizeText(data.code || data.text || '');
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(codeText);
        }
        if (ctx.onAction) ctx.onAction('code:copy', e, { text: codeText });
      } catch (err) {
        if (ctx.onAction) ctx.onAction('code:copy', e, { text: codeText, error: String(err && err.message ? err.message : err) });
      }
    });

    header.appendChild(copyBtn);
    codeBlock.appendChild(header);

    const body = el('pre', { className: 'ap-code-body' });
    body.appendChild(el('code', null, codeText));
    codeBlock.appendChild(body);

    wrap.appendChild(codeBlock);
    return wrap;
  };

  RENDERERS.cta = function (data) {
    const section = el('div', { className: 'ap-cta ap-section' });

    if (data.heading) {
      section.appendChild(el('h2', { className: 'ap-cta-heading' }, sanitizeText(data.heading)));
    }

    if (data.body) {
      section.appendChild(el('p', { className: 'ap-cta-body' }, sanitizeText(data.body)));
    }

    const btnRow = el('div', {
      style: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' },
    });

    if (data.primary && data.primary.text) {
      btnRow.appendChild(
        el(
          'a',
          {
            className: 'ap-btn ap-btn--primary',
            href: data.primary.url ? sanitizeUrl(data.primary.url) : '#',
            dataset: data.primary.action ? { action: sanitizeActionName(data.primary.action) } : {},
          },
          sanitizeText(data.primary.text)
        )
      );
    }

    if (data.secondary && data.secondary.text) {
      btnRow.appendChild(
        el(
          'a',
          {
            className: 'ap-btn ap-btn--secondary',
            href: data.secondary.url ? sanitizeUrl(data.secondary.url) : '#',
            dataset: data.secondary.action ? { action: sanitizeActionName(data.secondary.action) } : {},
          },
          sanitizeText(data.secondary.text)
        )
      );
    }

    section.appendChild(btnRow);
    return section;
  };

  RENDERERS.divider = function () {
    return el('hr', { className: 'ap-divider' });
  };

  RENDERERS.columns = function (data, renderSection) {
    const count = Math.min(Math.max(data.count || 2, 2), 4);
    const wrap = el('div', { className: 'ap-section' });
    const grid = el('div', { className: 'ap-columns ap-columns--' + count });

    (data.items || []).forEach((col) => {
      const colDiv = el('div');
      if (col && Array.isArray(col.sections)) {
        col.sections.forEach((s) => {
          const rendered = renderSection(s);
          if (rendered) {
            rendered.classList.remove('ap-section');
            rendered.style.padding = '0';
            colDiv.appendChild(rendered);
          }
        });
      }
      grid.appendChild(colDiv);
    });

    wrap.appendChild(grid);
    return wrap;
  };

  RENDERERS['image-text'] = function (data) {
    const wrap = el('div', { className: 'ap-section' });
    const layout = el('div', { className: 'ap-image-text' });

    const imgDiv = el('div', { className: 'ap-image-text-image' });
    if (data.image) {
      const img = el('img', { src: sanitizeUrl(data.image), alt: sanitizeText(data.alt || '') });
      imgDiv.appendChild(img);
    } else {
      imgDiv.textContent = sanitizeText(data.placeholder || 'Image');
    }

    const contentDiv = el('div', { className: 'ap-image-text-content' });
    if (data.title) {
      contentDiv.appendChild(el('h3', { className: 'ap-image-text-title' }, sanitizeText(data.title)));
    }
    if (data.body) {
      contentDiv.appendChild(el('p', { className: 'ap-image-text-body' }, sanitizeText(data.body)));
    }

    layout.appendChild(imgDiv);
    layout.appendChild(contentDiv);
    wrap.appendChild(layout);
    return wrap;
  };

  RENDERERS.timeline = function (data) {
    const wrap = el('div', { className: 'ap-section' });

    if (data.heading) {
      wrap.appendChild(el('h2', { className: 'ap-heading ap-heading--2 ap-mb-6' }, sanitizeText(data.heading)));
    }

    const timeline = el('div', { className: 'ap-timeline' });

    (data.items || []).forEach((item) => {
      const entry = el('div', { className: 'ap-timeline-item' });
      entry.appendChild(el('div', { className: 'ap-timeline-item-dot' }));
      if (item.date) {
        entry.appendChild(el('div', { className: 'ap-timeline-item-date' }, sanitizeText(item.date)));
      }
      entry.appendChild(el('div', { className: 'ap-timeline-item-title' }, sanitizeText(item.title || '')));
      if (item.body) {
        entry.appendChild(el('div', { className: 'ap-timeline-item-body' }, sanitizeText(item.body)));
      }
      timeline.appendChild(entry);
    });

    wrap.appendChild(timeline);
    return wrap;
  };

  // Tabset (ARIA complete + keyboard nav)
  RENDERERS.tabset = function (data, renderSection, ctx) {
    const wrap = el('div', { className: 'ap-section' });

    if (data.heading) {
      wrap.appendChild(el('h2', { className: 'ap-heading ap-heading--2 ap-tabset-header' }, sanitizeText(data.heading)));
    }

    const tabs = Array.isArray(data.tabs) ? data.tabs.slice(0, SAFETY_LIMITS.maxTabs) : [];
    if (!tabs.length) return wrap;

    const baseId = safeId(data.id, 'tabset-' + Math.random().toString(36).slice(2, 8));

    const tabBar = el('div', { className: 'ap-tabset-tabs', role: 'tablist', 'aria-orientation': 'horizontal', 'aria-label': sanitizeText(data.ariaLabel || data.heading || 'Tabs') });
    const panels = el('div', { className: 'ap-tabset-panels' });

    const ids = tabs.map((t, i) => safeId(t.id, baseId + '-tab-' + i));
    let activeIndex = typeof data.activeIndex === 'number' ? Math.max(0, Math.min(data.activeIndex, tabs.length - 1)) : 0;

    const tabButtons = [];
    const tabPanels = [];

    function setActive(nextIndex, focus) {
      activeIndex = Math.max(0, Math.min(nextIndex, tabs.length - 1));

      tabButtons.forEach((btn, i) => {
        const isActive = i === activeIndex;
        btn.classList.toggle('ap-tabset-tab--active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
        if (focus && isActive) btn.focus();
      });

      tabPanels.forEach((panel, i) => {
        const isActive = i === activeIndex;
        panel.hidden = !isActive;
      });
    }

    tabs.forEach((tab, index) => {
      const id = ids[index];
      const tabId = safeId(id, baseId + '-tab-' + index);
      const panelId = baseId + '-panel-' + index;

      const btn = el(
        'button',
        {
          type: 'button',
          className: 'ap-tabset-tab' + (index === activeIndex ? ' ap-tabset-tab--active' : ''),
          role: 'tab',
          id: tabId,
          'aria-selected': index === activeIndex ? 'true' : 'false',
          'aria-controls': panelId,
          tabindex: index === activeIndex ? '0' : '-1',
        },
        sanitizeText(tab.label || 'Tab ' + (index + 1))
      );

      btn.addEventListener('click', () => setActive(index, false));
      tabBar.appendChild(btn);
      tabButtons.push(btn);

      const panel = el('div', { className: 'ap-tabset-panel', role: 'tabpanel', id: panelId, 'aria-labelledby': tabId });
      panel.hidden = index !== activeIndex;

      if (Array.isArray(tab.sections)) {
        tab.sections.forEach((s) => {
          const rendered = renderSection(s);
          if (rendered) panel.appendChild(rendered);
        });
      }

      panels.appendChild(panel);
      tabPanels.push(panel);
    });

    tabBar.addEventListener('keydown', (e) => {
      const key = e.key;
      const current = activeIndex;
      let next = current;

      if (key === 'ArrowRight' || key === 'ArrowDown') next = (current + 1) % tabs.length;
      else if (key === 'ArrowLeft' || key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
      else if (key === 'Home') next = 0;
      else if (key === 'End') next = tabs.length - 1;
      else return;

      e.preventDefault();
      setActive(next, true);
    });

    wrap.appendChild(tabBar);
    wrap.appendChild(panels);
    return wrap;
  };

  // Form (validation + action payload)
  RENDERERS.form = function (data, ctx) {
    const wrap = el('div', { className: 'ap-section' });

    if (data.heading) {
      wrap.appendChild(el('h2', { className: 'ap-heading ap-heading--2 ap-mb-2' }, sanitizeText(data.heading)));
    }

    if (data.description) {
      wrap.appendChild(el('p', { className: 'ap-text ap-mb-4' }, sanitizeText(data.description)));
    }

    const formId = safeId(data.id, 'form-' + Math.random().toString(36).slice(2, 8));

    const form = el('form', { className: 'ap-form', id: formId, novalidate: 'novalidate' });

    const fieldsWrap = el('div', { className: 'ap-form-fields' });

    const fields = Array.isArray(data.fields) ? data.fields.slice(0, SAFETY_LIMITS.maxFields) : [];

    function getFieldKey(field, i) {
      return safeId(field.name, 'field-' + i);
    }

    function readControlValue(field, controlNode) {
      const type = field.type || 'text';
      if (!controlNode) return null;

      if (type === 'checkbox') {
        const input = controlNode.querySelector('input[type="checkbox"]') || controlNode;
        return !!input.checked;
      }
      if (type === 'radio') {
        const checked = form.querySelector('input[type="radio"][name="' + CSS.escape(field.name || '') + '"]:checked');
        return checked ? checked.value : null;
      }
      if (type === 'select') {
        return controlNode.value;
      }
      if (type === 'textarea') {
        return controlNode.value;
      }
      // input
      return controlNode.value;
    }

    function validateField(field, value) {
      const errors = [];
      const label = field.label || field.name || 'Field';

      const required = !!field.required;
      const type = field.type || 'text';

      if (required) {
        if (type === 'checkbox') {
          if (value !== true) errors.push(field.errorRequired || label + ' is required.');
        } else if (value === null || value === undefined || String(value).trim() === '') {
          errors.push(field.errorRequired || label + ' is required.');
        }
      }

      if (value !== null && value !== undefined) {
        const s = type === 'checkbox' ? '' : String(value);

        if (typeof field.minLength === 'number' && s.length < field.minLength) {
          errors.push(field.errorMinLength || label + ' must be at least ' + field.minLength + ' characters.');
        }
        if (typeof field.maxLength === 'number' && s.length > field.maxLength) {
          errors.push(field.errorMaxLength || label + ' must be at most ' + field.maxLength + ' characters.');
        }
        if (field.pattern && typeof field.pattern === 'string') {
          try {
            const re = new RegExp(field.pattern);
            if (s && !re.test(s)) errors.push(field.errorPattern || label + ' is invalid.');
          } catch (e) {
            // ignore invalid regex
          }
        }

        if (type === 'number' || type === 'range') {
          const num = Number(value);
          if (!Number.isFinite(num)) {
            errors.push(field.errorNumber || label + ' must be a number.');
          } else {
            if (typeof field.min === 'number' && num < field.min) {
              errors.push(field.errorMin || label + ' must be at least ' + field.min + '.');
            }
            if (typeof field.max === 'number' && num > field.max) {
              errors.push(field.errorMax || label + ' must be at most ' + field.max + '.');
            }
          }
        }
      }

      return errors;
    }

    const registry = []; // { field, key, inputNode, errorNode, helpNode }

    fields.forEach((field, i) => {
      if (!isPlainObject(field)) return;

      const fieldWrap = el('div');
      const key = getFieldKey(field, i);
      const name = typeof field.name === 'string' ? field.name : key;
      const labelText = field.label || name || 'Field';
      const type = field.type || 'text';

      const describedBy = [];

      if (labelText) {
        const label = el('label', { className: 'ap-form-field-label', for: formId + '-' + key }, sanitizeText(labelText));
        fieldWrap.appendChild(label);
      }

      let inputNode = null;

      if (type === 'textarea') {
        inputNode = el('textarea', {
          className: 'ap-form-field-textarea',
          id: formId + '-' + key,
          name: name,
          placeholder: field.placeholder ? sanitizeText(field.placeholder) : '',
          rows: typeof field.rows === 'number' ? field.rows : 3,
        });
        if (field.defaultValue) inputNode.value = String(field.defaultValue);
      } else if (type === 'select') {
        inputNode = el('select', {
          className: 'ap-form-field-select',
          id: formId + '-' + key,
          name: name,
        });

        const options = Array.isArray(field.options) ? field.options.slice(0, SAFETY_LIMITS.maxOptionsPerSelect) : [];
        options.forEach((opt) => {
          const optLabel = typeof opt === 'string' ? opt : (opt && (opt.label || opt.value)) || '';
          const optValue = typeof opt === 'string' ? opt : (opt && (opt.value || opt.label)) || '';
          const optionEl = el('option', { value: String(optValue) }, sanitizeText(String(optLabel)));
          inputNode.appendChild(optionEl);
        });

        if (field.defaultValue !== undefined && field.defaultValue !== null) {
          inputNode.value = String(field.defaultValue);
        }
      } else if (type === 'checkbox' || type === 'radio') {
        const row = el('div', { className: 'ap-form-field-row' });
        const input = el('input', {
          id: formId + '-' + key,
          type: type,
          name: name,
          value: field.value || 'on',
        });
        if (field.checked === true) input.checked = true;
        row.appendChild(input);
        if (field.inlineLabel) {
          const text = el('span', null, sanitizeText(field.inlineLabel || ''));
          row.appendChild(text);
        }
        inputNode = row;
      } else {
        // text, email, number, password, etc.
        inputNode = el('input', {
          className: 'ap-form-field-input',
          id: formId + '-' + key,
          type: type,
          name: name,
          placeholder: field.placeholder ? sanitizeText(field.placeholder) : '',
        });
        if (field.defaultValue) inputNode.value = String(field.defaultValue);
        if (field.autocomplete) inputNode.setAttribute('autocomplete', String(field.autocomplete));
        if (field.inputMode) inputNode.setAttribute('inputmode', String(field.inputMode));
      }

      // Common constraints (where supported)
      const baseInput = type === 'checkbox' || type === 'radio' ? inputNode.querySelector('input') : inputNode;
      if (baseInput) {
        if (field.required) baseInput.setAttribute('aria-required', 'true');
        if (field.required) baseInput.setAttribute('required', 'required');
        if (typeof field.minLength === 'number') baseInput.setAttribute('minlength', String(field.minLength));
        if (typeof field.maxLength === 'number') baseInput.setAttribute('maxlength', String(field.maxLength));
        if (field.pattern) baseInput.setAttribute('pattern', String(field.pattern));
        if (typeof field.min === 'number') baseInput.setAttribute('min', String(field.min));
        if (typeof field.max === 'number') baseInput.setAttribute('max', String(field.max));
        if (typeof field.step === 'number') baseInput.setAttribute('step', String(field.step));
        if (field.disabled) baseInput.setAttribute('disabled', 'disabled');
        if (field.readOnly) baseInput.setAttribute('readonly', 'readonly');
      }

      fieldWrap.appendChild(inputNode);

      let helpNode = null;
      if (field.helpText) {
        helpNode = el('div', { className: 'ap-form-field-help', id: formId + '-help-' + key }, sanitizeText(field.helpText));
        describedBy.push(helpNode.id);
        fieldWrap.appendChild(helpNode);
      }

      const errorNode = el('div', { className: 'ap-form-field-error', id: formId + '-err-' + key, role: 'alert', 'aria-live': 'polite' });
      errorNode.style.display = 'none';
      describedBy.push(errorNode.id);
      fieldWrap.appendChild(errorNode);

      if (baseInput && describedBy.length) {
        baseInput.setAttribute('aria-describedby', describedBy.join(' '));
      }

      fieldsWrap.appendChild(fieldWrap);
      registry.push({ field, key, inputNode, baseInput, errorNode });
    });

    form.appendChild(fieldsWrap);

    const actions = el('div', { className: 'ap-form-actions' });

    const submitAction = data.submit && data.submit.action ? sanitizeActionName(data.submit.action) : 'form:submit';
    const cancelAction = data.cancel && data.cancel.action ? sanitizeActionName(data.cancel.action) : 'form:cancel';

    function collectValues() {
      const values = {};
      registry.forEach((r, i) => {
        const name = typeof r.field.name === 'string' ? r.field.name : r.key;
        values[name] = readControlValue(r.field, r.baseInput || r.inputNode);
      });
      return values;
    }

    function showErrors(errorsByName) {
      registry.forEach((r) => {
        const name = typeof r.field.name === 'string' ? r.field.name : r.key;
        const errs = errorsByName[name] || [];
        const has = errs.length > 0;

        if (r.baseInput) r.baseInput.setAttribute('aria-invalid', has ? 'true' : 'false');
        r.errorNode.textContent = has ? errs[0] : '';
        r.errorNode.style.display = has ? 'block' : 'none';
      });
    }

    function validateAll(values) {
      const errorsByName = {};
      let valid = true;

      registry.forEach((r) => {
        const name = typeof r.field.name === 'string' ? r.field.name : r.key;
        const errs = validateField(r.field, values[name]);
        if (errs.length) {
          valid = false;
          errorsByName[name] = errs;
        }
      });

      return { valid, errorsByName };
    }

    function wireRealtimeValidation() {
      const mode = data.validateOn === 'change' || data.validateOn === 'blur' || data.validateOn === 'always' ? data.validateOn : 'submit';
      if (mode === 'submit') return;

      registry.forEach((r) => {
        const handler = () => {
          const values = collectValues();
          const res = validateAll(values);
          showErrors(res.errorsByName);
        };
        if (!r.baseInput) return;
        if (mode === 'change' || mode === 'always') {
          r.baseInput.addEventListener('input', handler);
          r.baseInput.addEventListener('change', handler);
        }
        if (mode === 'blur' || mode === 'always') {
          r.baseInput.addEventListener('blur', handler);
        }
      });
    }

    wireRealtimeValidation();

    if (data.submit && data.submit.text) {
      actions.appendChild(
        el(
          'button',
          {
            type: 'submit',
            className: 'ap-btn ap-btn--primary',
          },
          sanitizeText(data.submit.text)
        )
      );
    }

    if (data.cancel && data.cancel.text) {
      const cancelBtn = el(
        'button',
        {
          type: 'button',
          className: 'ap-btn ap-btn--secondary',
        },
        sanitizeText(data.cancel.text)
      );
      cancelBtn.addEventListener('click', (e) => {
        if (ctx.onAction) ctx.onAction(cancelAction, e, { formId });
      });
      actions.appendChild(cancelBtn);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const values = collectValues();
      const res = validateAll(values);
      showErrors(res.errorsByName);

      if (ctx.onAction) {
        ctx.onAction(submitAction, e, {
          formId,
          valid: res.valid,
          values,
          errors: res.errorsByName,
        });
      }

      if (!res.valid) {
        // Focus first invalid
        const firstInvalid = registry.find((r) => {
          const name = typeof r.field.name === 'string' ? r.field.name : r.key;
          return !!res.errorsByName[name];
        });
        if (firstInvalid && firstInvalid.baseInput && typeof firstInvalid.baseInput.focus === 'function') {
          firstInvalid.baseInput.focus();
        }
      }
    });

    form.appendChild(actions);
    wrap.appendChild(form);
    return wrap;
  };

  // Media block
  RENDERERS['media-block'] = function (data, ctx) {
    const wrap = el('div', { className: 'ap-section' });
    const layout = el('div', { className: 'ap-media-block' });

    const mediaDiv = el('div', { className: 'ap-media-block-media' });

    const mediaType = data.mediaType || 'image';
    if (mediaType === 'image' && data.image) {
      const img = el('img', { src: sanitizeUrl(data.image), alt: sanitizeText(data.alt || '') });
      mediaDiv.appendChild(img);
    } else if (mediaType === 'video' && data.thumbnail) {
      const img = el('img', { src: sanitizeUrl(data.thumbnail), alt: sanitizeText(data.alt || '') });
      mediaDiv.appendChild(img);

      mediaDiv.style.position = 'relative';
      const overlay = el('div', {
        style: {
          position: 'absolute',
          inset: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        },
      });
      overlay.appendChild(renderIcon('play', 40, ctx.ttPolicy));
      mediaDiv.appendChild(overlay);

      if (data.action) {
        mediaDiv.dataset.action = sanitizeActionName(data.action);
        mediaDiv.style.cursor = 'pointer';
      }
    } else if (mediaType === 'icon' && data.icon) {
      mediaDiv.appendChild(renderIcon(data.icon, 40, ctx.ttPolicy));
    } else {
      mediaDiv.textContent = sanitizeText(data.placeholder || 'Media');
    }

    const contentDiv = el('div', { className: 'ap-media-block-content' });
    if (data.label) {
      contentDiv.appendChild(el('div', { className: 'ap-hero-label ap-mb-2' }, sanitizeText(data.label)));
    }
    if (data.title) {
      contentDiv.appendChild(el('h3', { className: 'ap-media-block-title' }, sanitizeText(data.title)));
    }
    if (data.body) {
      contentDiv.appendChild(el('p', { className: 'ap-media-block-body' }, sanitizeText(data.body)));
    }

    layout.appendChild(mediaDiv);
    layout.appendChild(contentDiv);
    wrap.appendChild(layout);
    return wrap;
  };

  // -----------------------------
  // STREAMING PARSERS
  // -----------------------------

  // 1) Streaming JSON sections extractor (best-effort, no deps)
  class StreamingPageParser {
    constructor(onSection) {
      this.onSection = typeof onSection === 'function' ? onSection : () => {};
      this.buffer = '';
      this.insideSections = false;
      this.braceDepth = 0;
      this.currentObject = '';
      this.inString = false;
      this.escapeNext = false;

      // robust search state
      this._seenSectionsKey = false;
      this._seenArrayStart = false;
    }

    feed(chunk) {
      if (!chunk) return;
      const str = typeof chunk === 'string' ? chunk : String(chunk);
      this.buffer += str;

      for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (!this.insideSections) {
          // Search for the "sections" key progressively.
          if (!this._seenSectionsKey) {
            if (this.buffer.includes('"sections"')) {
              this._seenSectionsKey = true;
            } else {
              continue;
            }
          }

          if (!this._seenArrayStart) {
            const idx = this.buffer.indexOf('"sections"');
            if (idx !== -1) {
              const after = idx + '"sections"'.length;
              const bracketPos = this.buffer.indexOf('[', after);
              if (bracketPos !== -1) {
                this._seenArrayStart = true;
                this.insideSections = true;
              }
            }
          }
          continue;
        }

        if (this.escapeNext) {
          this.escapeNext = false;
          if (this.braceDepth > 0) this.currentObject += char;
          continue;
        }

        if (char === '\\') {
          this.escapeNext = true;
          if (this.braceDepth > 0) this.currentObject += char;
          continue;
        }

        if (char === '"') {
          this.inString = !this.inString;
          if (this.braceDepth > 0) this.currentObject += char;
          continue;
        }

        if (!this.inString) {
          if (char === '{') {
            if (this.braceDepth === 0) this.currentObject = '{';
            else this.currentObject += '{';
            this.braceDepth++;
          } else if (char === '}') {
            this.braceDepth--;
            if (this.braceDepth >= 0) this.currentObject += '}';
            if (this.braceDepth === 0) {
              const objStr = this.currentObject.trim();
              this.currentObject = '';
              if (objStr) {
                try {
                  const obj = JSON.parse(objStr);
                  this.onSection(obj);
                } catch (e) {
                  // ignore malformed chunk
                }
              }
            }
          } else if (char === ']') {
            if (this.braceDepth === 0) {
              this.insideSections = false;
            } else {
              this.currentObject += char;
            }
          } else {
            if (this.braceDepth > 0) this.currentObject += char;
          }
        } else {
          if (this.braceDepth > 0) this.currentObject += char;
        }
      }

      // prevent unbounded memory growth
      if (this.buffer.length > 250000) {
        this.buffer = this.buffer.slice(-8000);
      }
    }
  }

  // 2) NDJSON sections parser (recommended for reliability)
  class NDJSONSectionParser {
    constructor(onSection) {
      this.onSection = typeof onSection === 'function' ? onSection : () => {};
      this.lineBuffer = '';
    }

    feed(chunk) {
      if (!chunk) return;
      const str = typeof chunk === 'string' ? chunk : String(chunk);
      this.lineBuffer += str;
      let idx;
      while ((idx = this.lineBuffer.indexOf('\n')) !== -1) {
        const line = this.lineBuffer.slice(0, idx).trim();
        this.lineBuffer = this.lineBuffer.slice(idx + 1);
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          // allow either raw section objects or {section:{...}}
          if (obj && obj.type) this.onSection(obj);
          else if (obj && obj.section && obj.section.type) this.onSection(obj.section);
        } catch (e) {
          // ignore
        }
      }
      if (this.lineBuffer.length > 250000) {
        this.lineBuffer = this.lineBuffer.slice(-8000);
      }
    }

    flush() {
      const line = this.lineBuffer.trim();
      this.lineBuffer = '';
      if (!line) return;
      try {
        const obj = JSON.parse(line);
        if (obj && obj.type) this.onSection(obj);
        else if (obj && obj.section && obj.section.type) this.onSection(obj.section);
      } catch (e) {}
    }
  }

  // -----------------------------
  // MAIN CLASS
  // -----------------------------

  class AgentPages {
    /**
     * @param {Object} options
     * @param {string|HTMLElement} options.target
     * @param {string} [options.theme] - 'light' | 'dark' | 'brand'
     * @param {Object} [options.tokens]
     * @param {Object} [options.colors]
     * @param {boolean} [options.animate]
     * @param {number} [options.staggerMs]
     * @param {Function} [options.onAction]
     * @param {Array<string>} [options.allowedActions]
     * @param {('allowAll'|'allowList'|'denyAll')} [options.actionPolicy]
     * @param {Object} [options.customRenderers]
     * @param {Object} [options.componentCatalog] - host component registry
     * @param {boolean} [options.useShadow]
     * @param {string} [options.cspNonce] - nonce for injected <style>
     * @param {string} [options.trustedTypesPolicyName]
     * @param {Object} [options.trustedTypesPolicy] - pass an existing policy
     */
    constructor(options) {
      if (!options || !options.target) {
        throw new Error('AgentPages: target option is required');
      }

      this.useShadow = !!options.useShadow;

      if (typeof options.target === 'string') {
        this.hostEl = document.querySelector(options.target);
      } else {
        this.hostEl = options.target;
      }

      if (!this.hostEl) {
        throw new Error('AgentPages: target element not found');
      }

      // Root mount: never overwrite host element id.
      if (this.useShadow) {
        this.shadowRoot = this.hostEl.attachShadow({ mode: 'open' });
        this.mountRoot = document.createElement('div');
        this.shadowRoot.appendChild(this.mountRoot);
      } else {
        this.shadowRoot = null;
        this.mountRoot = this.hostEl;
      }

      this.theme = options.theme || 'light';
      this.tokens = Object.assign({}, DEFAULT_TOKENS, options.tokens || {});
      const baseTheme = THEMES[this.theme] || THEMES.light;
      this.colors = Object.assign({}, baseTheme, options.colors || {});
      this.animate = options.animate !== false;
      this.staggerMs = typeof options.staggerMs === 'number' ? options.staggerMs : 80;

      this.onAction = typeof options.onAction === 'function' ? options.onAction : null;
      this.allowedActions = Array.isArray(options.allowedActions) ? options.allowedActions.map(sanitizeActionName) : null;
      this.actionPolicy = options.actionPolicy || (this.allowedActions ? 'allowList' : 'allowAll');

      this.customRenderers = options.customRenderers || {};
      this.componentCatalog = options.componentCatalog || null;
      this.sectionCount = 0;

      this.cspNonce = typeof options.cspNonce === 'string' ? options.cspNonce : '';

      this.ttPolicy = options.trustedTypesPolicy || createTrustedTypesPolicy(options.trustedTypesPolicyName || 'agentpages');

      this.containerId = 'ap-' + Math.random().toString(36).slice(2, 10);
      this.rootContainer = document.createElement('div');
      this.rootContainer.id = this.containerId;
      this.mountRoot.appendChild(this.rootContainer);

      this.injectStyles();
    }

    static generateCSS(tokens, colors, containerId) {
      const t = Object.assign({}, DEFAULT_TOKENS, tokens || {});
      const theme = colors || (THEMES.light);
      return generateCSS(t, theme, containerId);
    }

    injectStyles() {
      const styleId = 'agentpages-style-' + this.containerId;
      const rootNode = this.useShadow ? this.shadowRoot : document.head;
      if (!rootNode) return;

      let existing;
      if (this.useShadow) {
        existing = Array.from(this.shadowRoot.querySelectorAll('style')).find((s) => s.id === styleId);
      } else {
        existing = document.getElementById(styleId);
      }
      if (existing) existing.remove();

      const style = document.createElement('style');
      style.id = styleId;
      if (this.cspNonce) style.setAttribute('nonce', this.cspNonce);
      style.textContent = generateCSS(this.tokens, this.colors, this.containerId);
      rootNode.appendChild(style);
    }

    setTheme(themeName, colorOverrides) {
      this.theme = themeName;
      const base = THEMES[themeName] || THEMES.light;
      this.colors = Object.assign({}, base, colorOverrides || {});
      this.injectStyles();
    }

    _isKnownType(type) {
      if (!type) return false;
      if (RENDERERS[type]) return true;
      if (this.customRenderers && this.customRenderers[type]) return true;
      if (this.componentCatalog && this.componentCatalog[type]) return true;
      return false;
    }

    _normalizeSections(sections, depth) {
      const currentDepth = typeof depth === 'number' ? depth : 0;
      if (!Array.isArray(sections) || currentDepth > SAFETY_LIMITS.maxDepth) {
        return [];
      }

      const result = [];
      for (const raw of sections) {
        if (!raw || typeof raw !== 'object') continue;
        if (!raw.type || !this._isKnownType(raw.type)) continue;

        const section = { ...raw };

        // clamp top-level strings
        for (const key of Object.keys(section)) {
          const val = section[key];
          if (typeof val === 'string') section[key] = clampString(val);
        }

        // type-specific clamping
        if (Array.isArray(section.items)) {
          if (section.type === 'faq') section.items = section.items.slice(0, SAFETY_LIMITS.maxFaqItems);
          else if (section.type !== 'comparison-table') section.items = section.items.slice(0, SAFETY_LIMITS.maxItemsPerList);
        }

        if (section.type === 'comparison-table' && Array.isArray(section.rows)) {
          section.rows = section.rows.slice(0, SAFETY_LIMITS.maxRowsPerTable);
        }

        if (section.type === 'tabset' && Array.isArray(section.tabs)) {
          section.tabs = section.tabs.slice(0, SAFETY_LIMITS.maxTabs);
        }

        if (section.type === 'form' && Array.isArray(section.fields)) {
          section.fields = section.fields.slice(0, SAFETY_LIMITS.maxFields);
        }

        // nested section containers
        const nestedKeys = ['columns', 'tabset', 'card', 'stack'];
        if (nestedKeys.includes(section.type)) {
          if (section.type === 'columns' && Array.isArray(section.items)) {
            section.items = (section.items || []).map((col) => {
              if (!col || typeof col !== 'object') return {};
              if (Array.isArray(col.sections)) {
                return { ...col, sections: this._normalizeSections(col.sections, currentDepth + 1) };
              }
              return col;
            });
          }

          if (section.type === 'tabset' && Array.isArray(section.tabs)) {
            section.tabs = (section.tabs || []).map((tab) => {
              if (!tab || typeof tab !== 'object') return {};
              if (Array.isArray(tab.sections)) {
                return { ...tab, sections: this._normalizeSections(tab.sections, currentDepth + 1) };
              }
              return tab;
            });
          }

          if ((section.type === 'card' || section.type === 'stack') && Array.isArray(section.sections)) {
            section.sections = this._normalizeSections(section.sections, currentDepth + 1);
          }
        }

        result.push(section);
        if (result.length >= SAFETY_LIMITS.maxSections) break;
      }

      return result;
    }

    renderSection(sectionData) {
      const type = sectionData.type;

      const ctx = {
        ttPolicy: this.ttPolicy,
        onAction: this.onAction,
      };

      const custom = this.customRenderers[type];
      const renderer = custom || RENDERERS[type];
      if (!renderer) {
        console.warn('AgentPages: unknown section type', type);
        return null;
      }

      if (type === 'columns' || type === 'tabset' || type === 'card' || type === 'stack') {
        // Some nested renderers accept (data, renderSection, ctx)
        if (type === 'tabset') return renderer(sectionData, this.renderSection.bind(this), ctx);
        return renderer(sectionData, this.renderSection.bind(this), ctx);
      }

      return renderer(sectionData, ctx);
    }

    _shouldAllowAction(actionName) {
      const name = sanitizeActionName(actionName);
      if (!name) return false;
      if (this.actionPolicy === 'denyAll') return false;
      if (this.actionPolicy === 'allowList') {
        return !!(this.allowedActions && this.allowedActions.includes(name));
      }
      return true; // allowAll
    }

    addSection(sectionData) {
      const node = this.renderSection(sectionData);
      if (!node) return;

      if (this.animate) {
        node.classList.add('ap-animate-in');
        node.style.animationDelay = this.sectionCount * this.staggerMs + 'ms';
      }

      // Action wiring
      if (this.onAction) {
        node.querySelectorAll('[data-action]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const actionName = sanitizeActionName(btn.dataset.action);
            if (!actionName) return;

            if (!this._shouldAllowAction(actionName)) {
              console.warn('AgentPages: blocked action', actionName);
              return;
            }

            this.onAction(actionName, e, { source: 'click' });
          });
        });
      }

      this.rootContainer.appendChild(node);
      this.sectionCount += 1;
    }

    render(pageData) {
      this.clear();

      if (!pageData || typeof pageData !== 'object') {
        console.warn('AgentPages: invalid pageData');
        return;
      }

      if (pageData.theme) {
        this.setTheme(pageData.theme, pageData.colors || {});
      }

      if (pageData.style && typeof pageData.style === 'object') {
        if (pageData.style.background) {
          this.rootContainer.style.background = String(pageData.style.background);
        }
      }

      const normalized = this._normalizeSections(pageData.sections || []);
      normalized.forEach((section) => this.addSection(section));
    }

    async renderStream(stream) {
      this.clear();

      const parser = new StreamingPageParser((section) => {
        const normalized = this._normalizeSections([section]);
        normalized.forEach((s) => this.addSection(s));
      });

      await this._consumeStream(stream, (chunk) => parser.feed(chunk));
    }

    async renderStreamNDJSON(stream) {
      this.clear();

      const parser = new NDJSONSectionParser((section) => {
        const normalized = this._normalizeSections([section]);
        normalized.forEach((s) => this.addSection(s));
      });

      await this._consumeStream(stream, (chunk) => parser.feed(chunk));
      parser.flush();
    }

    async _consumeStream(stream, onChunk) {
      if (stream instanceof ReadableStream && stream.getReader) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          onChunk(decoder.decode(value, { stream: true }));
        }
        return;
      }

      if (stream && stream[Symbol.asyncIterator]) {
        for await (const chunk of stream) {
          onChunk(typeof chunk === 'string' ? chunk : String(chunk));
        }
        return;
      }

      if (typeof stream === 'function') {
        await stream((chunk) => onChunk(chunk));
        return;
      }

      throw new Error('AgentPages: unsupported stream type');
    }

    async renderFromResponse(response, options) {
      const opts = options || {};
      const mode = opts.mode === 'ndjson' ? 'ndjson' : 'json';

      if (!response) {
        console.warn('AgentPages: invalid response');
        return;
      }

      // If caller wants NDJSON and a body stream exists, stream sections deterministically.
      if (mode === 'ndjson' && response.body) {
        return this.renderStreamNDJSON(response.body);
      }

      // Non-stream or no body: fall back to full-text parse.
      if (!response.body) {
        if (typeof response.text !== 'function') {
          console.warn('AgentPages: response has no body and no text()');
          return;
        }
        const t = await response.text();
        try {
          const json = JSON.parse(t);
          return this.render(json);
        } catch (e) {
          console.warn('AgentPages: failed to parse response as JSON');
          return;
        }
      }

      // Default: best-effort stream parse for a single JSON object containing "sections".
      return this.renderStream(response.body);
    }

    async renderSimulated(pageData, delayMs) {
      const delay = typeof delayMs === 'number' ? delayMs : 300;
      this.clear();

      const normalized = this._normalizeSections(pageData.sections || []);
      for (const section of normalized) {
        this.addSection(section);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    clear() {
      clearNode(this.rootContainer);
      this.sectionCount = 0;
    }

    destroy() {
      this.clear();

      const styleId = 'agentpages-style-' + this.containerId;
      if (this.useShadow && this.shadowRoot) {
        Array.from(this.shadowRoot.querySelectorAll('style')).forEach((s) => {
          if (s.id === styleId) s.remove();
        });
      } else {
        const style = document.getElementById(styleId);
        if (style) style.remove();
      }

      if (this.rootContainer && this.rootContainer.parentNode) {
        this.rootContainer.parentNode.removeChild(this.rootContainer);
      }
    }

    toHTML() {
      const styleId = 'agentpages-style-' + this.containerId;
      const styleEl = this.useShadow
        ? Array.from(this.shadowRoot.querySelectorAll('style')).find((s) => s.id === styleId)
        : document.getElementById(styleId);

      const styleContent = styleEl ? styleEl.textContent : '';

      let bodyHtml = '';
      try {
        const serializer = new XMLSerializer();
        bodyHtml = serializer.serializeToString(this.rootContainer);
      } catch (e) {
        bodyHtml = this.rootContainer.outerHTML || '';
      }

      return (
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        (styleContent ? '<style>' + styleContent + '</style>' : '') +
        '</head><body>' +
        bodyHtml +
        '</body></html>'
      );
    }
  }

  // -----------------------------
  // STATIC HELPERS & SCHEMA
  // -----------------------------

  const COMPONENT_TYPES = [
    'hero',
    'heading',
    'text',
    'feature-grid',
    'stat-row',
    'comparison-table',
    'steps',
    'callout',
    'faq',
    'quote',
    'list',
    'code',
    'cta',
    'divider',
    'columns',
    'image-text',
    'timeline',
    'tabset',
    'form',
    'media-block',
    'card',
    'stack',
  ];

  const PAGESCHEMA = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'AgentPages Page Description',
    type: 'object',
    properties: {
      version: { type: 'string' },
      theme: { type: 'string', enum: ['light', 'dark', 'brand'] },
      style: {
        type: 'object',
        properties: { background: { type: 'string' } },
        additionalProperties: true,
      },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          required: ['type'],
          properties: { type: { type: 'string', enum: COMPONENT_TYPES } },
          additionalProperties: true,
        },
      },
    },
    required: ['sections'],
  };

  const SYSTEMPROMPT = [
    'You generate structured page descriptions for AgentPages, a UI rendering runtime.',
    '',
    'OUTPUT FORMAT',
    '- Always output a single JSON object.',
    '- The top-level object MUST have a "sections" array.',
    '- Each item in "sections" is a section object with a "type" field and other fields.',
    '',
    'SUPPORTED SECTION TYPES',
    '- "hero": { type, label?, heading?, subheading?, cta? { text, url?, action? } }',
    '- "heading": { type, text, level? (1-3) }',
    '- "text": { type, text, align? ("left"|"center") }',
    '- "feature-grid": { type, heading?, subheading?, align?, items: [ { icon?, title, body? } ] }',
    '- "stat-row": { type, heading?, items: [ { value, label } ] }',
    '- "comparison-table": { type, heading?, columns: [string], rows: [array|object] }',
    '- "steps": { type, heading?, items: [ { title, body? } ] }',
    '- "callout": { type, variant? ("info"|"success"|"warning"|"error"), title?, text? }',
    '- "faq": { type, heading?, align?, items: [ { id?, question, answer } ] }',
    '- "quote": { type, text, author? }',
    '- "list": { type, heading?, ordered?, items: [ string | { text } ] }',
    '- "code": { type, language?, code }',
    '- "cta": { type, heading?, body?, primary?: { text, url?, action? }, secondary?: { text, url?, action? } }',
    '- "divider": { type }',
    '- "columns": { type, count? (2-4), items: [ { sections: [section...] } ] }',
    '- "image-text": { type, image?, alt?, placeholder?, title?, body? }',
    '- "timeline": { type, heading?, items: [ { date?, title, body? } ] }',
    '- "tabset": { type, id?, ariaLabel?, heading?, activeIndex?, tabs: [ { id?, label, sections: [section...] } ] }',
    '- "form": { type, id?, heading?, description?, validateOn? ("submit"|"change"|"blur"|"always"), fields: [ { name, label?, type?, placeholder?, helpText?, required?, minLength?, maxLength?, pattern?, min?, max?, options? } ], submit?: { text, action? }, cancel?: { text, action? } }',
    '- "media-block": { type, mediaType? ("image"|"video"|"icon"), image?, thumbnail?, icon?, alt?, action?, label?, title?, body?, placeholder? }',
    '- "card": { type, variant? ("default"|"accent"), heading?, body?, sections: [section...] }',
    '- "stack": { type, gap?, sections: [section...] }',
    '',
    'RULES',
    '- Do NOT output HTML, CSS, or JavaScript code.',
    '- Do NOT include markdown formatting.',
    '- All visible text must be plain strings.',
    '- Prefer concise, scannable sections over long walls of text.',
    '- Use multiple sections when needed: hero, explanation, comparison, steps, FAQ, CTA, etc.',
    '- Keep the total number of sections under 30.',
    '- Use "action" fields only when the host has a documented allowlist.',
    '',
    'OPTIONAL HOST COMPONENTS',
    '- The host may provide additional component types (e.g., "MetricCard", "ChartBlock").',
    '- If documented by the host, you MAY emit these types as { "type": "MetricCard", ... } with the expected fields.',
    '- Never invent raw HTML; always use component types.',
  ].join('\n');

  function AgentPagesStatic() {}

  AgentPagesStatic.version = '0.5.0';
  AgentPagesStatic.componentTypes = COMPONENT_TYPES.slice();
  AgentPagesStatic.iconNames = Object.keys(ICONS);
  AgentPagesStatic.themes = Object.keys(THEMES);
  AgentPagesStatic.getSchema = function () {
    return PAGESCHEMA;
  };
  AgentPagesStatic.getSystemPrompt = function (extraTypes) {
    if (Array.isArray(extraTypes) && extraTypes.length) {
      const customLines = extraTypes.map((name) => `- "${name}": host-defined component; follow its documented props.`);
      return SYSTEMPROMPT + '\n\nCUSTOM COMPONENT TYPES\n' + customLines.join('\n');
    }
    return SYSTEMPROMPT;
  };

  Object.assign(AgentPages, AgentPagesStatic);

  return AgentPages;
});
