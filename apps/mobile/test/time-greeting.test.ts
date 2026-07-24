import assert from 'node:assert/strict';
import test from 'node:test';

import { getTimeGreeting, getTimeGreetingKey } from '../src/ui/time-greeting';

test('selects a greeting from the device-local hour', () => {
  const atHour = (hour: number): Date => new Date(2026, 6, 22, hour, 0, 0);

  assert.equal(getTimeGreeting(atHour(0)), 'Good morning');
  assert.equal(getTimeGreeting(atHour(11)), 'Good morning');
  assert.equal(getTimeGreeting(atHour(12)), 'Good afternoon');
  assert.equal(getTimeGreeting(atHour(16)), 'Good afternoon');
  assert.equal(getTimeGreeting(atHour(17)), 'Good evening');
  assert.equal(getTimeGreeting(atHour(23)), 'Good evening');
});

test('exposes locale message keys for the same time boundaries', () => {
  const atHour = (hour: number): Date => new Date(2026, 6, 22, hour, 0, 0);

  assert.equal(getTimeGreetingKey(atHour(8)), 'greetingMorning');
  assert.equal(getTimeGreetingKey(atHour(14)), 'greetingAfternoon');
  assert.equal(getTimeGreetingKey(atHour(20)), 'greetingEvening');
});
