import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizePrimaryNavigationItem,
  primaryNavigationItems,
} from '../src/ui/primary-navigation';

test('keeps one canonical order for the four primary destinations', () => {
  assert.deepEqual(
    primaryNavigationItems.map(({ key, route }) => ({ key, route })),
    [
      { key: 'home', route: '/home' },
      { key: 'complaints', route: '/complaints' },
      { key: 'community', route: '/transparency' },
      { key: 'menu', route: '/menu' },
    ],
  );
});

test('shows Civic Area as part of More instead of adding a sixth tab', () => {
  assert.equal(normalizePrimaryNavigationItem('governance'), 'menu');
  assert.equal(normalizePrimaryNavigationItem('community'), 'community');
  assert.equal(
    primaryNavigationItems.some(({ key }) => String(key) === 'governance'),
    false,
  );
});
