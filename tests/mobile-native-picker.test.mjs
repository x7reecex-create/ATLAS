import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/const atlasIsTextEdit=el=>el instanceof Element && \([\s\S]*?\n\);/);
assert.ok(match, 'mobile keyboard classification must exist');

class FakeElement {
  constructor(tag, type = 'text', editable = false) {
    this.tag = tag;
    this.type = type;
    this.editable = editable;
  }
  matches(selector) {
    if (selector === 'input') return this.tag === 'input';
    if (selector === 'textarea,[contenteditable="true"]') return this.tag === 'textarea' || this.editable;
    return false;
  }
}
const isTextEdit = new Function('Element', match[0] + ';return atlasIsTextEdit;')(FakeElement);

test('native mobile pickers never trigger the text-keyboard layout', () => {
  for (const type of ['date', 'time', 'datetime-local', 'month', 'week', 'color', 'file', 'range', 'checkbox', 'radio', 'hidden']) {
    assert.equal(isTextEdit(new FakeElement('input', type)), false, type);
  }
  assert.equal(isTextEdit(new FakeElement('select')), false, 'native select');
});

test('real text-entry controls still receive keyboard clearance', () => {
  for (const type of ['text', 'search', 'email', 'url', 'tel', 'password', 'number']) {
    assert.equal(isTextEdit(new FakeElement('input', type)), true, type);
  }
  assert.equal(isTextEdit(new FakeElement('textarea')), true, 'textarea');
  assert.equal(isTextEdit(new FakeElement('div', 'text', true)), true, 'contenteditable');
  assert.equal(isTextEdit(null), false, 'null focus');
});
