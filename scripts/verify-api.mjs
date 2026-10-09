// Ekranların kullandığı istek dizilerini gateway'e karşı çalıştırır (simülatör yokken doğrulama; test dosyası değildir).
//   node scripts/verify-api.mjs            (GATEWAY_REST_URL, MAILPIT_URL ile değişir)
// vendor client-sdk'nın createApi'si + bearer taşıma kullanılır; uygulamadaki api katmanıyla aynı çağrılar.
import axios from 'axios';
import { randomUUID } from 'node:crypto';
import { createApi, apiErrorCode } from '../src/shared/vendor/client-sdk/index.js';
import { streamSse } from '../src/shared/http/sseStream.js';

const GW = process.env.GATEWAY_REST_URL || 'http://127.0.0.1:2000';
const MAIL = process.env.MAILPIT_URL || 'http://127.0.0.1:8025';
const results = [];
const note = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const mk = () => {
  const state = { token: null };
  const http = axios.create({ baseURL: GW, timeout: 30000, headers: { 'X-Auth-Transport': 'bearer', 'X-Platform': 'ios', 'X-Client': 'sinav-mobile/verify', 'X-Device-Id': randomUUID() } });
  http.interceptors.request.use((c) => { if (state.token) c.headers.Authorization = `Bearer ${state.token}`; return c; });
  return { state, http, api: createApi(http) };
};
const d = (res) => res.data.data;
const step = async (name, fn) => {
  try {
    const v = await fn();
    note(name, true);
    return v;
  } catch (e) {
    note(name, false, `${e.response?.status || ''} ${apiErrorCode(e) || e.message}`);
    return null;
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const latestCode = async (email, hint) => {
  for (let i = 0; i < 25; i += 1) {
    const list = await (await fetch(`${MAIL}/api/v1/messages`)).json();
    const m = (list.messages || []).find((x) => x.To.some((t) => t.Address === email) && x.Subject.includes(hint));
    if (m) { const mm = /(\d{3}) (\d{3})/.exec(m.Subject); if (mm) return mm[1] + mm[2]; }
    await sleep(300);
  }
  throw new Error(`kod e-postası gelmedi (${email})`);
};

const { state, http, api } = mk();
const email = `verify${Date.now()}@example.com`;

// ── Onboarding (misafir) ──
const g = await step('auth: guest', async () => d(await api.identityAuthGuest({})));
state.token = g?.auth.accessToken;
const exams = await step('onb: exams list', async () => d(await api.contentPublicExamsList()).items);
const trackKey = exams?.[0]?.tracks?.[0]?.key || 'yds-en';
const track = await step('onb: track detail', async () => d(await api.contentPublicTrackGet(trackKey)));
const upcoming = (track?.sessions || []).find((s) => s.status !== 'held');
await step('onb: enrollment create', async () => d(await api.learningEnrollmentCreate({ trackKey, targetScore: track.goalPresets.find((p) => p.isDefault)?.targetScore, dateMode: upcoming ? 'session' : 'unknown', ...(upcoming ? { examSessionKey: upcoming.key } : {}), goalReasonKeys: track.goalReasons.slice(0, 1).map((r) => r.key) })).enrollment);
await step('onb: availability get (empty)', async () => d(await api.learningAvailabilityGet()).days);
await step('onb: availability put', async () => api.learningAvailabilitySave([1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, minutes: weekday > 5 ? 60 : 30 }))));
const active = await step('onb: enrollment active (availability filled)', async () => { const e = d(await api.learningEnrollmentActiveGet()).enrollment; if (!e.availability.length) throw new Error('availability boş'); return e; });
console.log('     diagnostic status:', active?.diagnostic?.status);

let diag = await step('diag: start', async () => d(await api.learningDiagnosticStart()));
if (diag) {
  const code = diag.session.code;
  let cur = await step('diag: get item', async () => d(await api.learningDiagnosticGet(code, { position: diag.session.currentPosition })));
  let answered = 0; let halfwaySeen = false; let guard = 0;
  while (cur?.current && guard++ < 40) {
    const v = cur.current;
    const label = answered % 7 === 6 ? null : v.question.options[0].label;
    const r = await api.learningDiagnosticAnswer(code, { position: v.position, selectedLabel: label, timeMs: 4000, clientRef: randomUUID() }).then(d).catch((e) => { note('diag: answer', false, apiErrorCode(e)); return null; });
    if (!r) break;
    answered += 1;
    if (r.halfway) { halfwaySeen = true; cur = d(await api.learningDiagnosticGet(code)); continue; }
    if (r.next == null) break;
    cur = r.nextItem ? { current: r.nextItem } : d(await api.learningDiagnosticGet(code, { position: r.next }));
  }
  note(`diag: answered ${answered} items, halfway=${halfwaySeen}`, answered > 0);
  await step('diag: complete', async () => d(await api.learningDiagnosticComplete(code)));
  const res = await step('diag: result', async () => d(await api.learningDiagnosticResultGet(code)));
  if (res) console.log('     result keys: estimate', JSON.stringify(res.estimate), 'type0.estimatedAccuracy', res.types[0]?.estimatedAccuracy);
}
const prev = await step('onb: plan preview', async () => d(await api.learningPlanPreviewGet(7)));
if (prev) console.log('     preview days:', prev.days.length, 'tasks day0:', prev.days[0].tasks.map((t) => t.kind).join(','));

// ── Kayıt (misafir → öğrenci) ──
await step('signup: send code', async () => d(await api.identityAuthSendCode({ email, purpose: 'signup' })));
const reg = await step('signup: register', async () => d(await api.identityAuthRegister({ email, code: await latestCode(email, 'Kayıt'), displayName: 'Verify', consents: [{ type: 'kvkk_notice', granted: true }, { type: 'terms_of_use', granted: true }, { type: 'marketing_email', granted: false }] })));
state.token = reg?.auth.accessToken;
console.log('     role after register:', reg?.user.userAccountRole);

// ── Bugün ──
const today = await step('today: get', async () => d(await api.learningTodayGet()));
if (today) console.log('     today tasks:', today.day?.tasks.map((t) => `${t.kind}:${t.status}`).join(','), 'streak.week len', today.streak.week.length, 'access', today.access.tier);
const tasks = today?.day?.tasks || [];
for (const kind of ['practice', 'note', 'error_review', 'vocab_review', 'mock_exam', 'translation']) {
  const task = tasks.find((t) => t.kind === kind && t.status === 'pending');
  if (!task) continue;
  await step(`today: start task ${kind}`, async () => { const r = d(await api.learningPlanTaskStart(task.code)); console.log('     →', JSON.stringify(r).slice(0, 160)); return r; });
}
await step('today: adjust shortDay', async () => d(await api.learningPlanAdjust({ shortDay: { minutes: 20 } })));
const today2 = await step('today: get after adjust', async () => d(await api.learningTodayGet()));
const t2 = today2?.day?.tasks.find((t) => t.status === 'pending');
if (t2) await step('today: postpone task', async () => d(await api.learningPlanTaskPostpone(t2.code)));
await step('today: heartbeat', async () => d(await api.learningActivityHeartbeat({ seconds: 31 })));

// ── Çalış ──
const overview = await step('study: overview', async () => d(await api.learningStudyOverviewGet()));
const typeKey = overview?.recommendedTypeKey || overview?.types[0].key;
const typeDetail = await step('study: question type', async () => d(await api.learningStudyQuestionTypeGet(typeKey)));
if (typeDetail?.skills?.[0]) await step('study: skill detail', async () => d(await api.learningStudySkillGet(typeDetail.skills[0].key)));
await step('study: practice options', async () => d(await api.learningPracticeOptionsGet()));
const prac = await step('study: practice session create', async () => d(await api.learningPracticeSessionCreate({ questionTypeKeys: [typeKey], count: 5, mode: 'learning', difficulty: 'adaptive' })));
if (prac) {
  const code = prac.code;
  const sess = await step('session: get', async () => d(await api.learningSessionGet(code)));
  console.log('     session: feedbackMode', sess.feedbackMode, 'hintsEnabled', sess.hintsEnabled, 'maxTries', sess.maxTries, 'currentPosition', sess.currentPosition);
  let item = await step('session: item 1', async () => d(await api.learningSessionItemGet(code, 1)));
  await step('session: flag', async () => d(await api.learningSessionItemFlag(code, 1, true)));
  await step('session: hint reveal', async () => d(await api.learningSessionHintReveal(code, 1)));
  const first = item.question.options[0].label;
  const ans = await step('session: answer wrong-ish (opt A)', async () => d(await api.learningSessionAnswer(code, 1, { selectedLabel: first, timeMs: 5000, clientRef: randomUUID() })));
  console.log('     outcome:', ans?.outcome, 'canRetry', ans?.item?.canRetry, 'next', ans?.next);
  if (ans?.outcome === 'wrong_retry') {
    const other = item.question.options.find((o) => o.label !== first && !(ans.feedback.eliminatedLabels || []).includes(o.label)).label;
    const a2 = await step('session: retry answer', async () => d(await api.learningSessionAnswer(code, 1, { selectedLabel: other, timeMs: 3000, clientRef: randomUUID() })));
    console.log('     retry outcome:', a2?.outcome);
  }
  item = await step('session: item 1 refetch (feedback state)', async () => d(await api.learningSessionItemGet(code, 1)));
  console.log('     refetch: feedback', JSON.stringify(item.feedback), 'solution?', Boolean(item.solution), 'state.canRetry', item.state.canRetry);
  if (!item.solution) await step('session: solution reveal', async () => d(await api.learningSessionSolutionReveal(code, 1)));
  await step('session: mistake-type', async () => d(await api.learningSessionMistakeTypeSet(code, 1, 'attention')));
  await step('session: answer skip item 2', async () => d(await api.learningSessionAnswer(code, 2, { selectedLabel: null, timeMs: 1000, clientRef: randomUUID() })));
  await step('session: heartbeat with sessionCode', async () => d(await api.learningActivityHeartbeat({ seconds: 12, sessionCode: Number(code) })));
  await step('session: pause', async () => d(await api.learningSessionPause(code)));
  await step('session: complete', async () => d(await api.learningSessionComplete(code)));
  const res = await step('session: result', async () => d(await api.learningSessionResultGet(code)));
  if (res) console.log('     result totals', JSON.stringify(res.totals), 'nextActions', JSON.stringify(res.nextActions).slice(0, 150));
  const bm = item?.question?.itemCode && await step('bookmark: create', async () => d(await api.learningBookmarkCreate({ itemCode: item.question.itemCode })));
  const bl = await step('bookmark: list', async () => d(await api.learningBookmarksList({ page: 1, pageSize: 30 })));
  console.log('     bookmark sample:', JSON.stringify(bl?.items?.[0] || bm));
  if (bm) await step('bookmark: remove', async () => d(await api.learningBookmarkRemove(bm.code)));
}
// hap not
const skillNotes = typeDetail?.strategyNote;
if (skillNotes) {
  const nid = skillNotes.itemCode;
  const note1 = await step('note: content get', async () => d(await api.contentNoteGet(nid)));
  await step('note: read', async () => d(await api.learningNoteRead(nid, false)));
  await step('note: read understood', async () => d(await api.learningNoteRead(nid, true)));
  if (note1?.checkQuestions?.length) {
    const chk = await step('note: check session start', async () => d(await api.learningNoteCheckStart(nid)));
    if (chk) await step('note: check session get item', async () => d(await api.learningSessionItemGet(chk.code, 1)));
  }
  const conv = await step('note: tutor conversation with note context', async () => d(await api.tutorConversationCreate({ mode: 'explain', context: { kind: 'note', itemCode: String(nid) } })));
  void conv;
}

// ── Kelime ──
const vo = await step('vocab: overview', async () => d(await api.learningVocabOverviewGet()));
const deck = vo?.decks.find((x) => !x.locked);
if (deck) await step('vocab: subscribe deck', async () => d(await api.learningVocabDeckSubscribe(deck.key, { newPerDay: 5, isActive: true })));
const rs = await step('vocab: review start', async () => d(await api.learningVocabReviewStart({ limit: 20 })));
if (rs && !rs.empty) {
  let nx = await step('vocab: next', async () => d(await api.learningVocabReviewNext(rs.session.code)));
  let n = 0;
  while (nx && !nx.done && nx.card && n < 4) {
    const r = await step(`vocab: rate card ${n + 1}`, async () => d(await api.learningVocabCardReview(nx.card.code, { rating: n === 1 ? 'again' : 'good', durationMs: 3000, sessionCode: rs.session.code, clientRef: randomUUID() })));
    if (n === 1) await step('vocab: undo', async () => d(await api.learningVocabReviewUndo(rs.session.code)));
    n += 1;
    nx = r?.next ? { done: false, card: r.next } : { done: true };
  }
  await step('vocab: complete', async () => { const r = d(await api.learningVocabReviewComplete(rs.session.code)); console.log('     summary', JSON.stringify(r.summary)); return r; });
} else console.log('     (vocab review empty)');

// ── Hatalar ──
const ml = await step('mistakes: list', async () => d(await api.learningMistakesList({ status: 'open', sort: 'recent', page: 1, pageSize: 20 })));
if (ml?.items[0]) await step('mistakes: update type', async () => d(await api.learningMistakeUpdate(ml.items[0].code, { mistakeType: 'trap' })));
await step('mistakes: due list', async () => d(await api.learningMistakesList({ status: 'open', due: true, sort: 'due', page: 1, pageSize: 20 })));
await step('mistakes: review start', async () => d(await api.learningMistakeReviewStart({ limit: 10 })));

// ── Deneme ──
const eo = await step('exam: overview', async () => d(await api.learningExamsOverviewGet()));
const form = eo?.forms.find((f) => !f.locked) || eo?.forms[0];
if (form) {
  const fd = await step('exam: form get', async () => d(await api.learningExamFormGet(form.code)));
  const st = await step('exam: start', async () => d(await api.learningExamStart(form.code, fd?.defaultMode)));
  if (st) {
    const sc = st.sitting.code;
    await step('exam: sitting get', async () => d(await api.learningExamSittingGet(sc)));
    const qs = await step('exam: questions slice', async () => d(await api.learningExamQuestionsGet(sc, { from: 1, to: 40 })));
    if (qs) {
      await step('exam: answer put', async () => d(await api.learningExamAnswerPut(sc, 1, { selectedLabel: qs.items[0].options[0].label, flagged: true, timeMs: 4000 })));
      await step('exam: answer clear', async () => d(await api.learningExamAnswerPut(sc, 2, { selectedLabel: null, flagged: false, timeMs: 500 })));
      await step('exam: pause', async () => d(await api.learningExamPause(sc)));
      await step('exam: questions while paused (expect EXAM_PAUSED)', async () => { try { await api.learningExamQuestionsGet(sc, { from: 1, to: 5 }); throw new Error('beklenen hata yok'); } catch (e) { if (apiErrorCode(e) !== 'EXAM_PAUSED') throw e; } });
      await step('exam: resume', async () => d(await api.learningExamResume(sc)));
    }
    await step('exam: submit', async () => d(await api.learningExamSubmit(sc)));
    const er = await step('exam: result', async () => d(await api.learningExamResultGet(sc)));
    if (er) console.log('     result score', er.score, '/', er.scoreMax, 'analysisLocked', er.analysisLocked, 'types[0].accuracy', er.types[0]?.accuracy);
    await step('exam: analysis (free → 402 expected)', async () => { try { await api.learningExamAnalysisGet(sc); } catch (e) { if (e.response?.status !== 402) throw e; } });
    const rv = await step('exam: review list wrong', async () => d(await api.learningExamReviewList(sc, 'wrong')));
    if (rv?.items[0]) await step('exam: review item', async () => d(await api.learningExamReviewItemGet(sc, rv.items[0].position)));
  }
}

// ── Öğretmen ──
const ov = await step('tutor: overview', async () => d(await api.tutorOverviewGet({ limit: 50 })));
console.log('     llmAvailable', ov?.llmAvailable, 'usage', JSON.stringify(ov?.usage), 'starters', ov?.starters?.length);
const cv = await step('tutor: conversation create', async () => d(await api.tutorConversationCreate({ mode: 'free' })));
if (cv) {
  const events = [];
  const msg = { content: 'Merhaba, "although" ile "despite" farkı nedir? Türkçe karakterler: ğüşiöçİ', clientRef: randomUUID() };
  try {
    const ac = new AbortController();
    const last = await streamSse({
      fetchFn: fetch, url: `${GW}/api/sinav-service-tutor/v1/conversations/${cv.code}/messages`,
      headers: { 'X-Auth-Transport': 'bearer', Authorization: `Bearer ${state.token}` }, body: msg, signal: ac.signal,
      onEvent: (ev) => events.push(ev.event),
    });
    const kinds = [...new Set(events)];
    note('tutor: SSE stream', Boolean(last), `events=${kinds.join(',')} tokens=${events.filter((e) => e === 'token').length} last=${last?.event}/${last?.status || last?.code}`);
    if (last?.event === 'done') {
      await step('tutor: feedback', async () => d(await api.tutorMessageFeedback(last.messageCode, true)));
      await step('tutor: report', async () => d(await api.tutorMessageReport(last.messageCode, { reason: 'unclear', note: 'verify' })));
      await step('tutor: stop (finished → stopped:false)', async () => d(await api.tutorMessageStop(last.messageCode)));
    }
  } catch (e) {
    note('tutor: SSE stream', false, `${e.status || ''} ${e.code || e.message}`);
  }
  const full = await step('tutor: conversation get', async () => d(await api.tutorConversationGet(cv.code)));
  if (full) console.log('     messages:', full.messages.map((m) => `${m.role}:${m.status}`).join(','));
  // hata yolu: SSE öncesi JSON zarfı
  try {
    await streamSse({ fetchFn: fetch, url: `${GW}/api/sinav-service-tutor/v1/conversations/999999999/messages`, headers: { 'X-Auth-Transport': 'bearer', Authorization: `Bearer ${state.token}` }, body: { content: 'x', clientRef: randomUUID() } });
    note('tutor: SSE pre-stream error (404)', false, 'hata fırlamadı');
  } catch (e) { note('tutor: SSE pre-stream error (404)', e.status === 404 && e.code === 'TUTOR_CONVERSATION_NOT_FOUND', `${e.status} ${e.code}`); }
  await step('tutor: conversation patch pin', async () => d(await api.tutorConversationUpdate(cv.code, { pinned: true })));
  await step('tutor: conversation delete', async () => d(await api.tutorConversationDelete(cv.code)));
}
const tp = await step('tutor: translation prompt', async () => d(await api.tutorTranslationPromptNext({ direction: 'en_tr' })));
if (tp) {
  try {
    const ev = d(await api.tutorTranslationEvaluate({ promptCode: tp.promptCode, userText: 'Bulgular bir şey gösteriyor.', clientRef: randomUUID() }));
    note('tutor: translation evaluate', true, `status=${ev.status} score=${ev.totalScore}/${ev.maxScore}`);
  } catch (e) { note('tutor: translation evaluate', false, `${e.response?.status} ${apiErrorCode(e)}`); }
}

// ── Ben / ayarlar / hesap ──
await step('me: progress 7', async () => { const r = d(await api.learningProgressOverviewGet(7)); console.log('     progress totals', JSON.stringify(r.totals), 'types0', JSON.stringify(r.types[0])); return r; });
await step('me: progress 30', async () => d(await api.learningProgressOverviewGet(30)));
await step('me: prefs get', async () => d(await api.identityPreferencesGet()));
await step('me: prefs patch', async () => d(await api.identityPreferencesUpdate({ theme: 'dark', hapticsEnabled: false })));
await step('me: notification prefs get', async () => d(await api.identityNotificationPrefsGet()));
await step('me: notification prefs patch', async () => d(await api.identityNotificationPrefsUpdate({ dailyReminderEnabled: true, dailyReminderTime: '20:00' })));
await step('me: learner settings get', async () => d(await api.learningSettingsGet()));
await step('me: learner settings patch', async () => d(await api.learningSettingsUpdate({ defaultMockMode: 'timed', extraTimePercent: 25 })));
const e2 = d(await api.learningEnrollmentActiveGet()).enrollment;
await step('me: enrollment target patch', async () => d(await api.learningEnrollmentUpdate(e2.code, { targetScore: track.goalPresets[0].targetScore })));
await step('me: account get', async () => { const a = d(await api.identityAccountGet()); console.log('     account hasPassword', a.hasPassword, 'isGuest', a.isGuest); return a; });
await step('me: account patch name', async () => d(await api.identityAccountUpdate({ displayName: 'Verify 2', locale: 'en' })));
await step('me: password set (first)', async () => api.identityAccountPasswordSet({ newPassword: 'Sifre12345!' }));
await step('me: data export get (none yet)', async () => { const r = d(await api.identityDataExportGet()); console.log('     export get →', JSON.stringify(r)); return r; });
await step('me: data export request', async () => d(await api.identityDataExportRequest()));
await step('me: data export get', async () => { const r = d(await api.identityDataExportGet()); console.log('     export get →', JSON.stringify(r)); return r; });
await step('me: legal get', async () => d(await api.identityPublicLegalGet('kvkk_notice', { locale: 'tr' })));
await step('gateway: me', async () => d(await api.gatewayMe()));

// ── Premium ──
await step('pay: entitlements', async () => { const r = d(await api.billingEntitlementsGet()); console.log('     tier', r.tier, 'features', Object.keys(r.features).join(',')); return r; });
await step('pay: subscription', async () => { const r = d(await api.billingSubscriptionGet()); console.log('     status', r.status, 'hasSubscription', r.hasSubscription); return r; });
await step('pay: products', async () => d(await api.billingPublicProductsList()));
await step('pay: invoices', async () => d(await api.billingInvoicesList()));

// ── Giriş yolları ──
const fresh = mk();
await step('signin: password login', async () => d(await fresh.api.identityAuthPasswordLogin({ email, password: 'Sifre12345!' })));
await step('signin: password login wrong (expect 401)', async () => { try { await fresh.api.identityAuthPasswordLogin({ email, password: 'yanlis-sifre' }); throw new Error('beklenen hata yok'); } catch (e) { if (apiErrorCode(e) !== 'AUTH_INVALID_CREDENTIALS') throw e; } });
await step('signin: email code send', async () => d(await fresh.api.identityAuthSendCode({ email, purpose: 'login' })));
const vr = await step('signin: email code verify', async () => d(await fresh.api.identityAuthVerifyCode({ email, code: await latestCode(email, 'Giriş') })));
fresh.state.token = vr?.auth.accessToken;
let rf = null;
if (vr) rf = await step('gateway: refresh (bearer)', async () => d(await fresh.api.gatewayRefresh({ refreshToken: vr.auth.refreshToken })));
if (rf) fresh.state.token = rf.auth.accessToken;
await step('reset: request', async () => d(await fresh.api.identityAuthPasswordResetRequest({ email })));
await step('reset: confirm', async () => d(await fresh.api.identityAuthPasswordResetConfirm({ email, code: await latestCode(email, 'ifre'), newPassword: 'Yeni12345!!' })));
const lg = await step('reset: login with new password', async () => d(await fresh.api.identityAuthPasswordLogin({ email, password: 'Yeni12345!!' })));
await step('reset: old refresh token revoked (expect RT_INVALID/401)', async () => { try { await fresh.api.gatewayRefresh({ refreshToken: rf.auth.refreshToken }); throw new Error('eski oturum hâlâ geçerli'); } catch (e) { if (e.response?.status !== 401) throw e; } });
fresh.state.token = lg?.auth.accessToken;
await step('gateway: logout (bearer)', async () => fresh.api.gatewayLogout({ refreshToken: lg.auth.refreshToken }));
void http;

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} adım başarılı`);
if (failed.length) { console.log('Başarısız:', failed.map((f) => f.name).join('; ')); process.exit(1); }
