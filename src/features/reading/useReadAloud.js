import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState } from 'react';
import { looksEnglish, splitSentences } from '@shared/vendor/domain/lexicon-text.js';

// Konuşma motorunun 1.0'ı okuma için hızlı: görünen 1× motorda 0.88'dir.
export const READ_RATES = [{ label: '0,8', value: 0.72 }, { label: '1', value: 0.88 }, { label: '1,2', value: 1.04 }];
// Hız oturum boyunca hatırlanır (sunucu tercihi değil; cihaz sesine bağlı).
let savedRate = READ_RATES[1].value;
// Ses ipucu (Premium ses indir) oturumda bir kez kapatılınca bir daha gösterilmez.
let tipClosed = false;
// Sıradaki birkaç cümle önceden kuyruğa verilir: cümle arasında boşluk olmaz, ekran kilitliyken de akış sürer.
const AHEAD = 3;
const voiceCache = new Map();

/**
 * Dil için en iyi ses → { id, tier: 'premium'|'enhanced'|'basic' }. Kaliteli ses yoksa sistem varsayılanı (listedeki ilk ses eğlence sesi olabilir).
 * Söz (promise) saklanır: aynı anda gelen istekler aynı sırayla çözülür, cümle sırası bozulmaz.
 */
const voiceFor = (language) => {
  if (!voiceCache.has(language)) {
    const want = language.toLowerCase();
    // iOS: tanımlayıcıda "premium" > "enhanced" (expo-speech Premium'u 'Default' gösterir); Android: Enhanced kalite. Eğlence sesleri (com.apple.speech.synthesis) hiç seçilmez.
    const score = (v) => {
      const id = String(v.identifier || '').toLowerCase();
      if (id.includes('speech.synthesis') || id.includes('eloquence')) return -1;
      if (id.includes('.premium.')) return 3;
      if (id.includes('.enhanced.') || v.quality === Speech.VoiceQuality.Enhanced) return 2;
      return 0;
    };
    voiceCache.set(language, Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const best = voices
          .filter((v) => String(v.language || '').replace('_', '-').toLowerCase() === want && score(v) > 0)
          .sort((a, b) => score(b) - score(a))[0];
        return best ? { id: best.identifier, tier: score(best) === 3 ? 'premium' : 'enhanced' } : { id: undefined, tier: 'basic' };
      })
      .catch(() => ({ id: undefined, tier: 'basic' })));
  }
  return voiceCache.get(language);
};

/** Bölüm → okunacak birimler: blok blok cümleler. sentence, TapText'in aynı metinden hesapladığı cümle sırasıdır (vurgu için). */
const unitsOf = (blocks) => {
  const out = [];
  (blocks || []).forEach((b, block) => {
    splitSentences(String(b.x || '')).forEach((s, sentence) => {
      if (/[\p{L}\p{N}]/u.test(s.text)) out.push({ block, sentence, text: s.text });
    });
  });
  return out;
};

/** React dışı okuma motoru: konuşma geri çağrıları eski oturumu (gen) tanır ve yok sayar. emit({ status?, at?, rate? }). */
const createEngine = (emit) => {
  const s = { units: [], lang: 'en', rate: savedRate, onEnd: null, gen: 0, at: -1, next: 0, status: 'idle', voiceTier: null };
  const set = (patch) => {
    Object.assign(s, patch);
    emit(patch);
  };
  const languageOf = (text) => (s.lang === 'en' || looksEnglish(text) ? 'en-US' : 'tr-TR');

  const fill = async (g) => {
    while (g === s.gen && s.next < s.units.length && s.next <= Math.max(s.at, 0) + AHEAD) {
      const i = s.next;
      s.next += 1;
      const u = s.units[i];
      const language = languageOf(u.text);
      const voice = await voiceFor(language);
      if (g !== s.gen) return;
      if (language === 'en-US' && s.voiceTier !== voice.tier) set({ voiceTier: voice.tier });
      Speech.speak(u.text, {
        language,
        voice: voice.id,
        rate: s.rate,
        onStart: () => {
          if (g === s.gen) set({ at: i });
        },
        onDone: () => {
          if (g !== s.gen) return;
          if (i >= s.units.length - 1) {
            s.gen += 1;
            set({ at: -1, status: 'idle' });
            s.onEnd?.();
            return;
          }
          s.at = i + 1;
          fill(g);
        },
        // Dışarıdan durdurma (ör. sözlükte "Dinle") ya da hata: kaldığı cümlede duraklar.
        onStopped: () => {
          if (g !== s.gen) return;
          s.gen += 1;
          set({ status: 'paused' });
        },
        onError: () => {
          if (g !== s.gen) return;
          s.gen += 1;
          set({ status: 'paused' });
        },
      });
    }
  };

  const start = (index) => {
    if (!s.units.length) return;
    const i = Math.min(Math.max(0, index), s.units.length - 1);
    s.gen += 1;
    const g = s.gen;
    Speech.stop();
    s.next = i;
    set({ at: i, status: 'playing' });
    // Sessiz modda da duyulsun; ekran kilitlenince sürsün (iOS UIBackgroundModes: audio, expo-audio eklentisi).
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {}).finally(() => fill(g));
  };
  const halt = (status) => {
    s.gen += 1;
    Speech.stop();
    set(status === 'idle' ? { status, at: -1 } : { status });
  };

  return {
    configure: ({ units, lang, onEnd }) => Object.assign(s, { units, lang, onEnd }),
    playFrom: (blockIndex) => {
      const i = s.units.findIndex((u) => u.block >= blockIndex);
      if (i >= 0) start(i);
      else s.onEnd?.();
    },
    toggle: () => (s.status === 'playing' ? halt('paused') : start(s.at >= 0 ? s.at : 0)),
    skip: (delta) => start((s.at >= 0 ? s.at : 0) + delta),
    setRate: (rate) => {
      savedRate = rate;
      set({ rate });
      if (s.status === 'playing') start(s.at);
    },
    pause: () => {
      if (s.status === 'playing') halt('paused');
    },
    stop: () => halt('idle'),
    closeTip: () => {
      tipClosed = true;
      emit({ tipClosed: true });
    },
    dispose: () => {
      s.gen += 1;
      Speech.stop();
    },
  };
};

/**
 * Kitabı cihazın konuşma motoruyla cümle cümle okur (sunucu maliyeti yok).
 * blocks: bölüm blokları; lang: 'en' | 'auto' (auto'da İngilizce görünmeyen cümle Türkçe sesle okunur).
 * onEnd: bölümün son cümlesi bitti (okuyucu sonraki bölüme geçip playFrom(0) ile sürdürür).
 * → { status: 'idle'|'playing'|'paused', current: { block, sentence } | null, rate, showVoiceTip, playFrom, toggle, skip, setRate, pause, stop, closeTip }
 */
export function useReadAloud({ blocks, lang, onEnd }) {
  const units = useMemo(() => unitsOf(blocks), [blocks]);
  const [view, setView] = useState({ status: 'idle', at: -1, rate: savedRate, voiceTier: null, tipClosed });
  const [engine] = useState(() => createEngine((patch) => setView((v) => ({ ...v, ...patch }))));
  useEffect(() => {
    engine.configure({ units, lang, onEnd });
  }, [engine, units, lang, onEnd]);
  // Ekrandan çıkınca susar.
  useEffect(() => () => engine.dispose(), [engine]);

  const u = view.at >= 0 ? units[view.at] : null;
  return {
    ...engine,
    status: view.status,
    rate: view.rate,
    current: u ? { block: u.block, sentence: u.sentence } : null,
    // Cihazda kaliteli İngilizce ses yok: indirme yolu gösterilir.
    showVoiceTip: view.voiceTier === 'basic' && !view.tipClosed,
  };
}
