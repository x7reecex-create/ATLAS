import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const listener = html.split('\n').find(line => line.startsWith("document.addEventListener('input',e=>{if(e.target.matches('[data-decision-option]'))"));
assert.ok(listener, 'real decision input listener exists');

test('editing an option clears the displayed result without rerendering the focused input', () => {
  let onInput;
  let visible = true;
  const context = {
    atlasDecisionOptions: ['Walk', 'Read'], atlasDecisionResult: 'Walk',
    document: {
      addEventListener: (_, handler) => { onInput = handler; },
      getElementById: id => id === 'atlas-decision-result' ? { remove() { visible = false; } } : null,
    },
    render() { assert.fail('typing must not replace the focused input'); },
  };
  vm.runInNewContext(listener, context);
  onInput({ target: { matches: () => true, dataset: { decisionOption: '0' }, value: 'Cook' } });
  assert.equal(context.atlasDecisionOptions[0], 'Cook');
  assert.equal(context.atlasDecisionResult, null);
  assert.equal(visible, false, 'obsolete choice is no longer displayed');
});

test('typing before a first pick and unrelated input do not fail or clear other controls', () => {
  let onInput;
  const context = {
    atlasDecisionOptions: ['', ''], atlasDecisionResult: null,
    document: { addEventListener: (_, handler) => { onInput = handler; }, getElementById: () => null },
  };
  vm.runInNewContext(listener, context);
  onInput({ target: { matches: () => true, dataset: { decisionOption: '1' }, value: 'Read' } });
  onInput({ target: { matches: () => false } });
  assert.deepEqual(context.atlasDecisionOptions, ['', 'Read']);
});
