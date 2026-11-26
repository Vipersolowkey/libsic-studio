// A small page at /stats where the owner types the stats token and reads the visit numbers.
// The token is only kept in the page while it is open; it is sent to GET /api/stats and nowhere else.
module.exports = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Libsic Studio visits</title>
<style>body{font:16px system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse;width:100%;margin:.5rem 0 1.5rem}
td,th{border-bottom:1px solid #8884;padding:.35rem .5rem;text-align:left}input,button{font:inherit;padding:.35rem .6rem}#err{color:#c00}</style></head>
<body><h1>Libsic Studio visits</h1>
<p>Counts only: no names, cookies or addresses are stored. Visitors are counted once per day.</p>
<form id="f"><input id="t" type="password" placeholder="Stats token" autocomplete="off" required> <button>Show</button></form>
<p id="err"></p><div id="out"></div>
<script>
const out = document.getElementById('out'), err = document.getElementById('err');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const list = (o) => Object.entries(o).map(([k, v]) => esc(k) + ': ' + v).join(', ') || '-';
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault(); err.textContent = ''; out.textContent = '';
  const res = await fetch('/api/stats?days=14', { headers: { Authorization: 'Bearer ' + document.getElementById('t').value } });
  if (!res.ok) { err.textContent = res.status === 404 ? 'Stats are switched off (no STATS_TOKEN is set on the server).' : 'Wrong token.'; return; }
  const { days } = await res.json();
  out.innerHTML = '<table><tr><th>Day</th><th>Visitors</th><th>Pages opened</th><th>Rooms shown</th></tr>' +
    days.map((d) => '<tr><td>' + esc(d.day) + '</td><td>' + d.visitors + '</td><td>' + list(d.pages) + '</td><td>' + list(d.scenes) + '</td></tr>').join('') + '</table>';
});
</script></body></html>`;
