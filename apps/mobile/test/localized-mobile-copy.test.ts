import assert from 'node:assert/strict';
import test from 'node:test';
import { translate } from '@local-wellness/localization';
import {
  complaintStatuses,
  publicComplaintStatuses,
  routingDecisionStatuses,
} from '@local-wellness/types';

import {
  complaintStatusMessageKeys,
  publicComplaintStatusMessageKeys,
  routingDecisionStatusMessageKeys,
} from '../src/ui/localized-mobile-copy';

test('every complaint and routing status has translated mobile copy', () => {
  assert.deepEqual(Object.keys(complaintStatusMessageKeys).sort(), [...complaintStatuses].sort());
  assert.deepEqual(
    Object.keys(publicComplaintStatusMessageKeys).sort(),
    [...publicComplaintStatuses].sort(),
  );
  assert.deepEqual(
    Object.keys(routingDecisionStatusMessageKeys).sort(),
    [...routingDecisionStatuses].sort(),
  );

  assert.equal(
    translate('hi', complaintStatusMessageKeys.inspection_scheduled),
    'निरीक्षण निर्धारित',
  );
  assert.equal(translate('mr', routingDecisionStatusMessageKeys.manual_review), 'मानवी पुनरावलोकन');
});
