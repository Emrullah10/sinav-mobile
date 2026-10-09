// Saf (platformdan bağımsız) SSE okuyucu: RN'de `expo/fetch` ile, node'da yerleşik fetch ile aynı kod çalışır.
// Vendor'daki tutorMessageSend RN'de kullanılamaz (RN fetch gövdeyi akış olarak vermez, TextDecoder garantisi yok);
// ayrıştırma mantığı (parseSseChunk) vendor'dan gelir, burada yalnız taşıma + UTF-8 çözümü vardır.
import { parseSseChunk } from '../vendor/client-sdk/src/tutor.js';

/** Parça sınırında bölünen çok baytlı karakterleri doğru çözen artımlı UTF-8 çözücü. */
export const createUtf8Decoder = () => {
  if (typeof globalThis.TextDecoder === 'function') {
    const dec = new globalThis.TextDecoder('utf-8');
    return (bytes) => dec.decode(bytes, { stream: true });
  }
  let pending = [];
  return (bytes) => {
    const all = pending.length ? Uint8Array.from([...pending, ...bytes]) : bytes;
    // Sondaki tamamlanmamış dizilimi sonraki parçaya bırak.
    let end = all.length;
    let i = end - 1;
    let back = 0;
    while (i >= 0 && back < 4 && (all[i] & 0xc0) === 0x80) {
      i -= 1;
      back += 1;
    }
    if (i >= 0) {
      const lead = all[i];
      const need = lead >= 0xf0 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc0 ? 2 : 1;
      if (need > back + 1) end = i;
    }
    pending = Array.from(all.subarray(end));
    let out = '';
    const chunk = all.subarray(0, end);
    for (let j = 0; j < chunk.length; ) {
      const b = chunk[j];
      let cp;
      let n;
      if (b < 0x80) { cp = b; n = 1; }
      else if (b < 0xe0) { cp = ((b & 0x1f) << 6) | (chunk[j + 1] & 0x3f); n = 2; }
      else if (b < 0xf0) { cp = ((b & 0x0f) << 12) | ((chunk[j + 1] & 0x3f) << 6) | (chunk[j + 2] & 0x3f); n = 3; }
      else { cp = ((b & 0x07) << 18) | ((chunk[j + 1] & 0x3f) << 12) | ((chunk[j + 2] & 0x3f) << 6) | (chunk[j + 3] & 0x3f); n = 4; }
      out += String.fromCodePoint(cp);
      j += n;
    }
    return out;
  };
};

/**
 * POST + text/event-stream. SSE başlamadan dönen JSON hata zarfı `error.status/code/body` ile fırlatılır.
 * Dönüş: son `done` / `error` olayı ({ event, ...data }).
 */
export const streamSse = async ({ fetchFn, url, headers, body, signal, onEvent }) => {
  const res = await fetchFn(url, {
    method: 'POST',
    signal,
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...headers },
  });
  if (!String(res.headers.get('content-type') || '').includes('text/event-stream')) {
    let parsed = null;
    try {
      parsed = await res.json();
    } catch {
      /* gövde yok */
    }
    throw Object.assign(new Error(parsed?.error?.code || `HTTP ${res.status}`), {
      status: res.status,
      body: parsed,
      code: parsed?.error?.code,
    });
  }
  if (!res.body?.getReader) throw Object.assign(new Error('STREAM_UNSUPPORTED'), { code: 'STREAM_UNSUPPORTED' });
  const reader = res.body.getReader();
  const decode = createUtf8Decoder();
  let buf = '';
  let last = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decode(value).replace(/\r\n/g, '\n');
    const { events, rest } = parseSseChunk(buf);
    buf = rest;
    for (const ev of events) {
      onEvent?.(ev);
      if (ev.event === 'done' || ev.event === 'error') last = { event: ev.event, ...ev.data };
    }
  }
  return last;
};
