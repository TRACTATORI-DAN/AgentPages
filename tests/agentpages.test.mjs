import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import AgentPages from '../dist/agentpages.umd.js';

function setup() {
  const dom = new JSDOM('<!doctype html><div id="app"></div>', { url: 'https://example.com/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.Node = dom.window.Node;
  global.CSS = dom.window.CSS;
  return dom;
}

test('blocked href becomes # via sanitizeHref', () => {
  setup();
  const ap = new AgentPages('#app', {});
  ap.render({ sections: [{ type: 'cta', title: 'X', cta: { label: 'Bad', url: 'javascript:alert(1)' } }] });
  const a = document.querySelector('a');
  assert.ok(a);
  assert.equal(a.getAttribute('href'), '#');
});

test('theme switch updates same style element', () => {
  setup();
  const ap = new AgentPages('#app', {});
  const style1 = document.getElementById('ap-styles');
  ap.setTheme('dark');
  const style2 = document.getElementById('ap-styles');
  assert.ok(style1);
  assert.ok(style2);
  assert.equal(style1, style2);
});

test('stack gap uses space vars', () => {
  setup();
  const ap = new AgentPages('#app', {});
  ap.render({ sections: [{ type: 'stack', gap: 8, items: [{ type: 'card', title: 'A' }, { type: 'card', title: 'B' }] }] });
  const stack = document.querySelector('.ap-stack');
  assert.ok(stack);
  assert.ok(String(stack.style.gap || '').includes('var(--ap-space-'));
});
