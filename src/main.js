import './style.css';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { move, ping, sendVoice, setHost, setStatusListener, stopAll } from './api.js';
import { createVoice } from './voice.js';

const $ = (id) => document.getElementById(id);
const statusEl = $('status');

setStatusListener((ok) => {
  statusEl.textContent = ok ? 'Connected' : 'NO CONNECTION';
  statusEl.className = ok ? 'ok' : 'bad';
});

// ---- Hold-to-move buttons: one 150 ms interval per held direction ----
const holds = new Map(); // dir -> interval id

function press(btn) {
  const dir = btn.dataset.dir;
  if (holds.has(dir)) return;
  btn.classList.add('pressed');
  move(dir, 1);
  holds.set(dir, setInterval(() => move(dir, 1), 150));
}

function release(btn) {
  const dir = btn.dataset.dir;
  if (!holds.has(dir)) return;
  clearInterval(holds.get(dir));
  holds.delete(dir);
  btn.classList.remove('pressed');
  move(dir, 0);
}

function releaseAll() {
  document.querySelectorAll('.hold').forEach(release);
}

document.querySelectorAll('.hold').forEach((btn) => {
  const down = (e) => { e.preventDefault(); press(btn); };
  const up = (e) => { e.preventDefault(); release(btn); };
  btn.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => btn.addEventListener(t, up));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
});

$('stop').addEventListener('click', () => { releaseAll(); stopAll(); });

// ---- Voice ----
const voice = createVoice(
  {
    getLang: () => $('lang').value,
    keepListening: () => $('keep').checked,
    onListening: (on) => $('mic').classList.toggle('listening', on),
    onHeard: (text) => { $('heard').textContent = `Heard: ${text}`; $('reply').textContent = 'ESP32: ...'; },
    onError: (msg) => { $('error').textContent = msg; },
  },
  async (text) => {
    const reply = await sendVoice(text);
    $('reply').textContent = `ESP32: ${reply ?? 'NO CONNECTION'}`;
  },
);

$('mic').addEventListener('click', () => voice.toggle());
$('keep').addEventListener('change', (e) => { if (!e.target.checked) voice.stop(); });

// ---- Settings ----
$('ip').addEventListener('change', async (e) => {
  setHost(e.target.value);
  await Preferences.set({ key: 'ip', value: e.target.value.trim() });
  ping();
});

// ---- App lifecycle ----
App.addListener('pause', () => { releaseAll(); stopAll(); voice.stop(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

(async () => {
  const { value } = await Preferences.get({ key: 'ip' });
  if (value) { $('ip').value = value; setHost(value); }
  KeepAwake.keepAwake().catch(() => {}); // no-op in a plain browser
  ping();
  setInterval(() => { if (!holds.size) ping(); }, 3000);
})();
