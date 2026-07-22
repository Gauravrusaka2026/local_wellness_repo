import assert from 'node:assert/strict';
import test from 'node:test';

import { designTokens, statusLabels } from './index.js';

test('design tokens expose civic and accessibility primitives', () => {
  assert.equal(designTokens.color.primary, '#17683B');
  assert.equal(designTokens.status.routePending, '#7A4EAB');
  assert.equal(designTokens.breakpoint.xs, '480px');
  assert.match(statusLabels.in_progress, /progress/i);
});
