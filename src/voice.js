import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const RETRY_ERRORS = ['No match', 'No speech input'];

// ui: { getLang, keepListening, onListening(bool), onHeard(text), onError(msg) }
// onText(text) is awaited before listening restarts.
export function createVoice(ui, onText) {
  let active = false;
  let token = 0; // invalidates a cycle when the user stops it

  async function ensureReady() {
    const { available } = await SpeechRecognition.available();
    if (!available) throw new Error('Speech recognition not available on this device');
    let perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== 'granted') perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== 'granted') throw new Error('Microphone permission denied');
  }

  async function cycle() {
    if (active) return;
    active = true;
    const me = ++token;
    let again = false;
    ui.onError('');
    try {
      await ensureReady();
      ui.onListening(true);
      const { matches } = await SpeechRecognition.start({
        language: ui.getLang(),
        maxResults: 1,
        partialResults: false,
        popup: false,
      });
      if (me !== token) return;
      ui.onListening(false);
      const text = matches?.[0]?.trim();
      if (text) {
        ui.onHeard(text);
        await onText(text);
      }
      again = true;
    } catch (e) {
      if (me !== token) return;
      const msg = e?.message ?? String(e);
      again = RETRY_ERRORS.includes(msg);
      if (!again) ui.onError(msg);
    }
    ui.onListening(false);
    active = false;
    if (again && me === token && ui.keepListening()) setTimeout(cycle, 300);
  }

  async function stop() {
    token++;
    active = false;
    ui.onListening(false);
    try { await SpeechRecognition.stop(); } catch { /* not listening */ }
  }

  return { toggle: () => (active ? stop() : cycle()), stop };
}
