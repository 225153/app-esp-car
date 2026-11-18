import { CapacitorHttp } from '@capacitor/core';

const TIMEOUT_MS = 1500;
let host = '192.168.4.1';
let onStatus = () => {};

export const setHost = (ip) => { host = ip.trim() || '192.168.4.1'; };
export const setStatusListener = (fn) => { onStatus = fn; };

async function get(path) {
  try {
    const res = await CapacitorHttp.get({
      url: `http://${host}${path}`,
      connectTimeout: TIMEOUT_MS,
      readTimeout: TIMEOUT_MS,
      responseType: 'text',
    });
    const ok = res.status >= 200 && res.status < 300;
    onStatus(ok);
    return ok ? String(res.data).trim() : null;
  } catch {
    onStatus(false);
    return null;
  }
}

export const ping = () => get('/voice?text=');
export const move = (dir, state) => get(`/cmd?dir=${dir}&state=${state}`);
export const sendVoice = (text) => get(`/voice?text=${encodeURIComponent(text)}`);

export function stopAll() {
  return Promise.all([get('/seq?q=s'), get('/cmd?dir=s&state=1')]);
}
