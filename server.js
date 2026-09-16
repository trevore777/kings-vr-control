const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}
const port = Number(process.env.PORT || 3200);
const hosted = process.env.NODE_ENV === 'production';
const statePath = path.join(root, 'data', 'state.json');
const initialPath = path.join(root, 'data', 'initial-state.json');

function loadState() {
  const source = fs.existsSync(statePath) ? statePath : initialPath;
  const state = JSON.parse(fs.readFileSync(source, 'utf8'));
  const placeholderBatteries = {'VR-01':82,'VR-02':76,'VR-03':91,'VR-04':88,'VR-05':84};
  for (const device of state.devices) {
    // Previous MVP seeded sample batteries. Do not present them as real readings.
    if (device.appVersion === 'Not connected' && device.lastSeen == null && device.battery === placeholderBatteries[device.id] && device.updatedAt == null) device.battery = null;
  }
  if (hosted && state.devices.some(device => device.student !== undefined || device.studentCode !== undefined)) {
    for (const device of state.devices) { delete device.student; delete device.studentCode; }
    // The old activity log could contain student names. Retire it during migration.
    state.events = [];
    saveState(state);
  } else if (!hosted) {
    let changed = false;
    for (const device of state.devices) {
      if (device.student !== undefined) { delete device.student; changed = true; }
      if (device.studentCode === undefined) { device.studentCode = ''; changed = true; }
    }
    // The old activity log could contain student names. Retire it during migration.
    if (state.events.some(event => /\bfor\b/.test(event.message))) { state.events = []; changed = true; }
    if (changed && fs.existsSync(statePath)) saveState(state);
  }
  state.hosted = hosted;
  return state;
}

function saveState(state) {
  delete state.hosted;
  fs.writeFileSync(`${statePath}.tmp`, JSON.stringify(state, null, 2));
  fs.renameSync(`${statePath}.tmp`, statePath);
}

function send(res, status, payload, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {'content-type': type, 'cache-control': 'no-store'});
  res.end(type.startsWith('application/json') ? JSON.stringify(payload) : payload);
}

function safeEqual(a = '', b = '') {
  const one = Buffer.from(a); const two = Buffer.from(b);
  return one.length === two.length && crypto.timingSafeEqual(one, two);
}

function teacherAllowed(req) {
  if (!process.env.APP_USERNAME || !process.env.APP_PASSWORD) return true;
  const token = (req.headers.authorization || '').replace(/^Basic /, '');
  let value = '';
  try { value = Buffer.from(token, 'base64').toString(); } catch {}
  const split = value.indexOf(':');
  return split > -1 && safeEqual(value.slice(0, split), process.env.APP_USERNAME) && safeEqual(value.slice(split + 1), process.env.APP_PASSWORD);
}

function requireTeacher(req, res) {
  if (teacherAllowed(req)) return true;
  res.writeHead(401, {'www-authenticate':'Basic realm="Kings VR Control"'});
  res.end('Authentication required');
  return false;
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100000) throw new Error('Request too large');
  }
  return raw ? JSON.parse(raw) : {};
}

function addEvent(state, message) {
  state.events.unshift({id: crypto.randomUUID(), message, at: new Date().toISOString()});
  state.events = state.events.slice(0, 30);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') return send(res, 200, {ok:true});

  if (url.pathname === '/api/device/heartbeat' && req.method === 'POST') {
    if (!process.env.DEVICE_API_KEY || !safeEqual(req.headers['x-device-key'] || '', process.env.DEVICE_API_KEY)) return send(res, 401, {error:'Invalid device key'});
    try {
      const update = await body(req); const state = loadState();
      const device = state.devices.find(item => item.id === update.id);
      if (!device) return send(res, 404, {error:'Unknown device'});
      for (const key of ['battery','activity','appVersion','status']) if (update[key] !== undefined) device[key] = update[key];
      device.lastSeen = new Date().toISOString(); saveState(state);
      return send(res, 200, {ok:true, device});
    } catch (error) { return send(res, 400, {error:error.message}); }
  }

  if (url.pathname.startsWith('/api/') && !requireTeacher(req, res)) return;
  if (url.pathname === '/api/state' && req.method === 'GET') return send(res, 200, loadState());

  if (url.pathname.match(/^\/api\/devices\/VR-0[1-5]$/) && req.method === 'PATCH') {
    try {
      const update = await body(req); const state = loadState();
      const id = url.pathname.split('/').pop(); const device = state.devices.find(item => item.id === id);
      if (update.student !== undefined) return send(res, 400, {error:'Names are not accepted'});
      if (update.studentCode !== undefined) {
        if (hosted) return send(res, 400, {error:'Student codes stay on the local Mac only'});
        if (update.studentCode !== '' && !/^\d{1,12}$/.test(String(update.studentCode))) return send(res, 400, {error:'Enter digits only, not a name or email'});
        device.studentCode = String(update.studentCode);
      }
      for (const key of ['activity','installedApps']) if (update[key] !== undefined) device[key] = String(update[key]).slice(0, key === 'installedApps' ? 500 : 100);
      if (update.status !== undefined) {
        if (!['ready','active','attention','charging'].includes(update.status)) return send(res, 400, {error:'Invalid status'});
        device.status = update.status;
      }
      if (update.battery !== undefined) {
        const battery = Number(update.battery);
        if (update.battery === null || update.battery === '') device.battery = null;
        else if (Number.isInteger(battery) && battery >= 0 && battery <= 100) device.battery = battery;
        else return send(res, 400, {error:'Battery must be 0–100 or blank'});
      }
      if (update.installedApps !== undefined) device.updatedAt = new Date().toISOString();
      addEvent(state, `${id} updated`); saveState(state);
      return send(res, 200, device);
    } catch (error) { return send(res, 400, {error:error.message}); }
  }

  if (url.pathname === '/api/session' && req.method === 'PATCH') {
    try {
      const update = await body(req); const state = loadState();
      if (update.name !== undefined) state.session.name = String(update.name).slice(0, 100);
      if (update.active !== undefined) {
        state.session.active = Boolean(update.active);
        state.session.startedAt = state.session.active ? new Date().toISOString() : null;
        addEvent(state, state.session.active ? `Session started: ${state.session.name}` : 'Session ended');
      }
      saveState(state); return send(res, 200, state.session);
    } catch (error) { return send(res, 400, {error:error.message}); }
  }

  if (req.method !== 'GET') return send(res, 404, {error:'Not found'});
  if (!requireTeacher(req, res)) return;
  const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const file = path.join(root, 'public', requested);
  if (!file.startsWith(path.join(root, 'public')) || !fs.existsSync(file)) return send(res, 404, 'Not found', 'text/plain');
  const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
  return send(res, 200, fs.readFileSync(file), types[path.extname(file)] || 'application/octet-stream');
});

loadState(); // Remove any legacy student fields before accepting hosted requests.
server.listen(port, () => console.log(`King’s VR Control listening on ${port}`));
