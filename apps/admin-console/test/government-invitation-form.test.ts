import assert from 'node:assert/strict';
import test from 'node:test';

import type { GovernmentInvitationOptions } from '@local-wellness/types';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { GovernmentInvitationForm } from '../app/invitation-form';

const authorityId = '1579439f-6e87-46d4-8411-e6559f4ddf51';

const invitationOptions: GovernmentInvitationOptions = {
  authorities: [
    {
      authorityType: 'municipal_corporation',
      code: 'BMC',
      id: authorityId,
      name: 'Brihanmumbai Municipal Corporation',
    },
  ],
  departments: [
    {
      authorityId,
      code: 'HEALTH',
      id: '7a6af88b-d00e-44dc-b21d-af5b778d1441',
      name: 'Public Health Department',
      type: 'department',
    },
  ],
  wards: [
    {
      authorityId,
      code: 'A',
      id: 'a93fe312-6f26-4d4b-a9da-e1cd0ad68dc6',
      name: 'Ward A',
      type: 'ward',
    },
  ],
};

test('renders reviewed authority names instead of requiring an administrator to enter UUIDs', () => {
  const markup = renderToStaticMarkup(
    createElement(GovernmentInvitationForm, {
      canAssignPrivilegedRoles: true,
      fixedAuthorityId: null,
      options: invitationOptions,
    }),
  );

  assert.match(markup, /Governing authority/u);
  assert.match(markup, /Brihanmumbai Municipal Corporation \(BMC\)/u);
  assert.match(markup, /This exact address becomes the official/u);
  assert.match(markup, /Government operator/u);
  assert.doesNotMatch(markup, /Enter authority UUID/u);
});

test('renders municipal authority scope as a fixed reviewed value', () => {
  const markup = renderToStaticMarkup(
    createElement(GovernmentInvitationForm, {
      canAssignPrivilegedRoles: false,
      fixedAuthorityId: authorityId,
      options: invitationOptions,
    }),
  );

  assert.match(markup, /Brihanmumbai Municipal Corporation \(BMC\)/u);
  assert.match(markup, /Municipal administrators may invite users only within their assigned/u);
  assert.doesNotMatch(markup, /Authority moderator/u);
  assert.doesNotMatch(markup, /Municipal administrator<\/option>/u);
});

test('fails closed when no verified authority option is available', () => {
  const markup = renderToStaticMarkup(
    createElement(GovernmentInvitationForm, {
      canAssignPrivilegedRoles: true,
      fixedAuthorityId: null,
      options: { authorities: [], departments: [], wards: [] },
    }),
  );

  assert.match(markup, /No verified authorities available/u);
  assert.match(markup, /No eligible governing authority is available/u);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>Create government invitation<\/button>/u);
});
