import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, checkPassword } from '../src/middleware/passwords.js';
test('password hashes are salted and verify correctly', async () => { const a=await hashPassword('a-very-strong-test-password'); const b=await hashPassword('a-very-strong-test-password'); assert.notEqual(a,b); assert.equal(await checkPassword('a-very-strong-test-password',a),true); assert.equal(await checkPassword('wrong-password',a),false); });
