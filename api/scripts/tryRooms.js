// Walks through saving, opening, changing and deleting a room against the running API,
// and prints what happened at each step. Start the API first (npm start), then run:
//   npm run try:rooms
// The API address can be changed with: API_URL=https://... npm run try:rooms
const BASE = process.env.API_URL || 'http://localhost:4000';

async function call(label, method, path, { body, key } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'x-edit-key': key } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  console.log(`\n${label}\n  ${method} ${path} -> ${res.status}`);
  if (text) console.log('  ' + text);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const created = await call('1. Save a new room', 'POST', '/api/rooms', {
    body: { name: 'My test room', sceneSlug: 'rainy-cafe', settings: { effect: 'rain' } },
  });
  const { code } = created.room;
  const key = created.editKey;

  await call('2. Open it with its share code', 'GET', `/api/rooms/${code}`);
  await call('3. Try to change it WITHOUT the edit key (should be 401)', 'PUT', `/api/rooms/${code}`, { body: { name: 'Hacked' } });
  await call('4. Try to change it with a WRONG key (should be 403)', 'PUT', `/api/rooms/${code}`, { body: { name: 'Hacked' }, key: 'wrong-key' });
  await call('5. Change it with the right key', 'PUT', `/api/rooms/${code}`, { body: { name: 'Renamed', settings: { lightOn: false } }, key });
  await call('6. Try a scene that does not exist (should be 400)', 'PUT', `/api/rooms/${code}`, { body: { sceneSlug: 'atlantis' }, key });
  await call('7. Delete it with the right key (should be 204)', 'DELETE', `/api/rooms/${code}`, { key });
  await call('8. Open it again (should be 404)', 'GET', `/api/rooms/${code}`);
}

main().catch((err) => {
  console.error('Could not finish:', err.message, '(is the API running?)');
  process.exitCode = 1;
});
