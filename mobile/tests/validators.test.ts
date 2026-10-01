import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateMobile,
  validateOtp,
  formatCountdown,
} from '../src/utils/validators.ts';

test('email', () => {
  assert.equal(validateEmail('jenish@example.com'), null);
  assert.ok(validateEmail(''));
  assert.ok(validateEmail('jenish@'));
  assert.ok(validateEmail('no spaces@x.com'));
});

test('password needs 8+ chars with a letter and a number', () => {
  assert.equal(validatePassword('Passw0rd1'), null);
  assert.ok(validatePassword('short1'));
  assert.ok(validatePassword('onlyletters'));
  assert.ok(validatePassword('12345678'));
});

test('confirm password must match', () => {
  assert.equal(validateConfirmPassword('abc12345', 'abc12345'), null);
  assert.ok(validateConfirmPassword('abc12345', 'abc12346'));
  assert.ok(validateConfirmPassword('abc12345', ''));
});

test('Indian mobile numbers: 10 digits starting 6-9', () => {
  assert.equal(validateMobile('9876543210'), null);
  assert.equal(validateMobile('98765 43210'), null);
  assert.ok(validateMobile('5876543210'));
  assert.ok(validateMobile('987654321'));
  assert.ok(validateMobile(''));
});

test('otp is exactly 6 digits', () => {
  assert.equal(validateOtp('012345'), null);
  assert.ok(validateOtp('12345'));
  assert.ok(validateOtp('12a456'));
});

test('countdown format', () => {
  assert.equal(formatCountdown(30), '0:30');
  assert.equal(formatCountdown(5), '0:05');
  assert.equal(formatCountdown(600), '10:00');
});
