import assert from 'node:assert/strict';
const base = (process.env.QA_API_URL || 'http://localhost:5002').replace(/\/$/, '');
const stamp = `${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
const password = 'BrandStudio-QA-Strong-Password-2026!';
async function request(path, { token, ...options } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}
async function signup(suffix) {
  const response = await request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name: `QA ${suffix}`, email: `qa-${suffix}-${stamp}@example.test`, organizationName: `QA Org ${suffix} ${stamp}`, password }) });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.ok(response.data.token);
  return response.data;
}
const unauth = await request('/api/prompts');
assert.equal(unauth.status, 401, 'protected route must reject anonymous requests');
const a = await signup('alpha');
const me = await request('/api/auth/me', { token: a.token });
assert.equal(me.status, 200);
assert.equal(me.data.user.role, 'owner');
const wrong = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: a.user.email, password: 'incorrect-password' }) });
assert.equal(wrong.status, 401, 'wrong password must be rejected');
const created = await request('/api/prompts', { token: a.token, method: 'POST', body: JSON.stringify({ name: `Tenant-private-${stamp}`, body: 'Tenant isolation smoke test' }) });
assert.equal(created.status, 201, JSON.stringify(created.data));
const b = await signup('beta');
const listB = await request('/api/prompts', { token: b.token });
assert.equal(listB.status, 200);
assert.ok(!listB.data.some((item) => item.name === `Tenant-private-${stamp}`), 'second organization must not see first organization prompts');
console.log('PASS: signup, login session, /me, wrong-password rejection, anonymous protection, organization data isolation');
