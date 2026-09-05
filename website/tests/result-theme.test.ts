import assert from 'node:assert/strict';
import test from 'node:test';
import { THEMES, parseResultTheme, decodeResultTheme, readableResultTheme, contrastRatio } from '../app/lib/resultTheme.ts';

test('result themes accept bounded colors and derive names from the palette', () => {
  assert.equal(parseResultTheme({ ...THEMES[1], name: 'Unreviewed title' }).name, 'TOKYO NIGHT');
  assert.equal(parseResultTheme({ ...THEMES[1], accent: '#ABCDEF', name: 'Unreviewed title' }).name, 'OMARCHY');
  assert.equal(parseResultTheme({ ...THEMES[1], bg: 'url(https://example.invalid)' }).name, 'OSAKA JADE');
  assert.equal(parseResultTheme({ ...THEMES[1], bg: '#fff' }).name, 'OSAKA JADE');
  assert.deepEqual(decodeResultTheme('invalid'), THEMES[0]);
  assert.deepEqual(decodeResultTheme(JSON.stringify(THEMES[1])), THEMES[1]);
});

test('cards remain readable across dark, light, and low-contrast custom palettes', () => {
  for (const saved of [...THEMES, { ...THEMES[0], bg: '#777777', ink: '#777777', muted: '#777777', accent: '#777777', panel: '#ffffff' }]) {
    const snapshot = { ...saved };
    const rendered = readableResultTheme(saved);
    assert.equal(rendered.bg, saved.bg);
    for (const color of ['ink', 'muted', 'accent', 'error'] as const) {
      assert.ok(contrastRatio(rendered[color], rendered.bg) >= 4.5, `${saved.name} ${color}`);
    }
    assert.ok(contrastRatio(rendered.ink, rendered.panel) >= 4.5);
    assert.deepEqual(saved, snapshot, 'Rendering must not change the stored palette');
  }
});
