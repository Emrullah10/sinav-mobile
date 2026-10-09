import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Flag, Square, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, Button, Chip, ErrorState, IconButton, Sheet, Skeleton, Text, TextField, TopBar, useToast } from '@components';
import { api } from '@api';
import { apiErrorCode, errorKind, errorText, newClientRef, unwrap } from '@shared/api/helpers';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { Blocks } from '@features/tutor/Blocks';
import { sendTutorMessage } from '@shared/http/tutorStream';
import { useHaptics } from '@hooks/useHaptics';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const MODES = ['free', 'explain', 'sentence_xray'];
const REPORT_REASONS = ['wrong_info', 'unclear', 'off_topic', 'inappropriate', 'other'];

const toLocal = (m) => ({
  code: m.code, role: m.role, status: m.status, content: m.content, blocks: m.blocks || [], sources: m.sources || [],
  needsExpertReview: m.needsExpertReview, feedback: m.feedback ?? null, preset: m.preset || null,
});

function Bubble({ message, onFeedback, onReport, onSource, onPreset, isLast, busy }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const mine = message.role === 'user';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 6 }}>
      <View
        style={{
          maxWidth: '92%',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: radius.lg,
          backgroundColor: mine ? colors.accent.default : colors.bg.surface,
          borderWidth: mine ? 0 : 1,
          borderColor: colors.border.default,
        }}
      >
        {message.content ? (
          <Text variant="body-l" selectable style={{ color: mine ? colors.text['on-accent'] : colors.text.primary }}>
            {message.content}
          </Text>
        ) : (
          <Text variant="body-m" color="tertiary">{t('tutor.chat.thinking')}…</Text>
        )}
      </View>
      {!mine ? (
        <View style={{ maxWidth: '100%', gap: 8, alignSelf: 'stretch' }}>
          <Blocks blocks={message.blocks} />
          {message.status === 'interrupted' ? <Text variant="caption" color="tertiary">{t('tutor.chat.interrupted')}</Text> : null}
          {message.status === 'failed' ? <Text variant="caption" color="danger">{t('tutor.chat.failed')}</Text> : null}
          {message.needsExpertReview ? <Text variant="caption" color="warning">{t('tutor.chat.expertReview')}</Text> : null}
          {message.sources?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <Text variant="caption" color="tertiary">{t('tutor.chat.sources')}:</Text>
              {message.sources.map((s) => (
                <Chip key={s.code} size="sm" label={s.title} onPress={() => onSource(s)} />
              ))}
            </View>
          ) : null}
          {message.status !== 'streaming' && message.content ? (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <IconButton icon={ThumbsUp} size={32} variant={message.feedback === true ? 'tonal' : 'standard'} accessibilityLabel={t('tutor.chat.helpful')} onPress={() => onFeedback(message, true)} />
              <IconButton icon={ThumbsDown} size={32} variant={message.feedback === false ? 'tonal' : 'standard'} accessibilityLabel={t('tutor.chat.notHelpful')} onPress={() => onFeedback(message, false)} />
              <IconButton icon={Flag} size={32} accessibilityLabel={t('tutor.chat.report')} onPress={() => onReport(message)} />
            </View>
          ) : null}
          {isLast && !busy && message.status === 'complete' ? (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {['simpler', 'example'].map((p) => (
                <Chip key={p} size="sm" label={t(`tutor.preset.${p}`)} onPress={() => onPreset(p)} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ChatBody({ code, starter, conv, initialMessages }) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const haptics = useHaptics();
  const qc = useQueryClient();
  const scroll = useRef(null);
  const reportSheet = useRef(null);
  const abort = useRef(null);
  const assistantCode = useRef(null);
  const sentStarter = useRef(false);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportNote, setReportNote] = useState('');

  useEffect(() => () => abort.current?.abort(), []);

  const patchLast = (fn) => setMessages((cur) => (cur ? cur.map((m, i) => (i === cur.length - 1 ? fn(m) : m)) : cur));

  const send = useCallback(
    async (content, preset) => {
      const body = content.trim();
      if (!body || busy) return;
      setNotice(null);
      setBusy(true);
      setText('');
      setMessages((cur) => [
        ...(cur || []),
        { code: `u-${Date.now()}`, role: 'user', status: 'complete', content: body, blocks: [], sources: [] },
        { code: `a-${Date.now()}`, role: 'assistant', status: 'streaming', content: '', blocks: [], sources: [] },
      ]);
      const controller = new AbortController();
      abort.current = controller;
      assistantCode.current = null;
      try {
        const last = await sendTutorMessage(
          code,
          { content: body, ...(mode ? { mode } : {}), ...(preset ? { preset } : {}), clientRef: newClientRef() },
          {
            signal: controller.signal,
            onEvent: ({ event, data }) => {
              if (event === 'meta') {
                assistantCode.current = data.messageCode;
                patchLast((m) => ({ ...m, code: String(data.messageCode) }));
              } else if (event === 'token') {
                patchLast((m) => ({ ...m, content: m.content + data.text }));
              } else if (event === 'block') {
                patchLast((m) => ({ ...m, blocks: [...m.blocks, data.block] }));
              } else if (event === 'done') {
                patchLast((m) => ({
                  ...m,
                  status: data.status,
                  content: data.content ?? m.content,
                  sources: data.sources || [],
                  needsExpertReview: data.needsExpertReview,
                }));
              }
            },
          },
        );
        if (last?.event === 'error') {
          patchLast((m) => ({ ...m, status: last.partial ? 'interrupted' : 'failed' }));
          setNotice({ tone: 'danger', message: t(`apiErrors.${last.code}`, { defaultValue: t('apiErrors.defaultErrorMessage') }) });
        }
        haptics.soft();
      } catch (e) {
        if (e.name !== 'AbortError') {
          const c = e.code || apiErrorCode(e);
          setMessages((cur) => (cur ? cur.slice(0, -2) : cur));
          setText(body);
          if (c === 'QUOTA_EXCEEDED') setNotice({ tone: 'warning', message: t('tutor.chat.quota'), premium: true });
          else if (c === 'TUTOR_STREAM_ALREADY_RUNNING') setNotice({ tone: 'warning', message: t('tutor.chat.running') });
          else setNotice({ tone: 'danger', message: t(`apiErrors.${c}`, { defaultValue: t('state.error.network.body') }) });
        }
      } finally {
        setBusy(false);
        abort.current = null;
        qc.invalidateQueries({ queryKey: queryKeys.tutor.overview() });
      }
    },
    [busy, code, mode, qc, t, haptics],
  );

  // Başlangıç önerisinden gelindiyse ilk mesajı otomatik gönder.
  useEffect(() => {
    if (starter && messages && messages.length === 0 && !sentStarter.current) {
      sentStarter.current = true;
      send(String(starter));
    }
  }, [starter, messages, send]);

  const stop = async () => {
    try {
      if (assistantCode.current) await api.tutorMessageStop(assistantCode.current);
    } catch {
      /* akış kendiliğinden kapanır */
    }
    abort.current?.abort();
  };

  const feedback = async (m, isHelpful) => {
    try {
      await api.tutorMessageFeedback(m.code, isHelpful);
      setMessages((cur) => cur.map((x) => (x.code === m.code ? { ...x, feedback: isHelpful } : x)));
    } catch (e) {
      toast.show({ message: errorText(t, e), tone: 'danger' });
    }
  };

  const submitReport = async (reason) => {
    try {
      await api.tutorMessageReport(reportTarget.code, { reason, ...(reportNote.trim() ? { note: reportNote.trim() } : {}) });
      reportSheet.current?.dismiss();
      setReportNote('');
      toast.show({ message: t('tutor.chat.reportThanks'), tone: 'success' });
      setMessages((cur) => cur.map((x) => (x.code === reportTarget.code ? { ...x, needsExpertReview: true } : x)));
    } catch (e) {
      reportSheet.current?.dismiss();
      toast.show({
        message: apiErrorCode(e) === 'TUTOR_REPORT_ALREADY_EXISTS' ? t('tutor.chat.reportExists') : errorText(t, e),
        tone: 'danger',
      });
    }
  };

  const header = (
    <TopBar
      title={conv?.title || t('tutor.title')}
      subtitle={conv?.context?.label ? t('tutor.chat.context', { label: conv.context.label }) : undefined}
      onBack={() => router.back()}
    />
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      {header}
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <Text variant="body-l" color="secondary">{t('tutor.chat.intro')}</Text>
        ) : (
          messages.map((m, i) => (
            <Bubble
              key={m.code}
              message={m}
              busy={busy}
              isLast={i === messages.length - 1}
              onFeedback={feedback}
              onReport={(msg) => {
                setReportTarget(msg);
                reportSheet.current?.present();
              }}
              onSource={(s) => router.push(`/not/${s.code}`)}
              onPreset={(p) => send(t(`tutor.preset.${p}`), p)}
            />
          ))
        )}
        {notice ? (
          <Banner
            tone={notice.tone}
            message={notice.message}
            onClose={() => setNotice(null)}
            action={notice.premium ? { label: t('today.access.upgrade'), onPress: () => router.push('/premium') } : undefined}
          />
        ) : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
          backgroundColor: colors.bg.canvas,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {MODES.map((m) => (
            <Chip key={m} size="sm" label={t(`enums.tutor_mode.${m}`)} selected={(mode ?? conv?.mode) === m} onPress={() => setMode(m)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <View
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border.input,
              backgroundColor: colors.bg.input,
              paddingHorizontal: 12,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('tutor.chat.placeholder')}
              placeholderTextColor={colors.text.tertiary}
              accessibilityLabel={t('tutor.chat.placeholder')}
              multiline
              maxLength={4000}
              editable={!busy}
              style={{ maxHeight: 120, minHeight: 46, color: colors.text.primary, fontSize: 16, paddingVertical: 10 }}
            />
          </View>
          {busy ? (
            <IconButton icon={Square} variant="tonal" accessibilityLabel={t('tutor.chat.stop')} onPress={stop} />
          ) : (
            <IconButton icon={ArrowUp} variant="tonal" accessibilityLabel={t('tutor.chat.send')} disabled={!text.trim()} onPress={() => send(text)} />
          )}
        </View>
      </View>

      <Sheet ref={reportSheet} title={t('tutor.report.title')}>
        <View style={{ gap: 12 }}>
          <TextField label={t('tutor.report.note')} value={reportNote} onChangeText={setReportNote} multiline maxLength={1000} />
          {REPORT_REASONS.map((r) => (
            <Button key={r} title={t(`tutor.report.reason.${r}`)} variant="secondary" size="md" onPress={() => submitReport(r)} />
          ))}
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

export default function TutorChat() {
  const { chat: code, starter } = useLocalSearchParams();
  const { t } = useT();
  const { colors } = useTheme();
  const query = useQuery({
    queryKey: queryKeys.tutor.conversation(code),
    queryFn: async () => unwrap(await api.tutorConversationGet(code)),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  if (query.isPending || query.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
        <TopBar title={t('tutor.title')} onBack={() => router.back()} />
        {query.isError ? (
          <ErrorState kind={errorKind(query.error)} onRetry={() => query.refetch()} />
        ) : (
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton height={56} />
            <Skeleton height={96} />
          </View>
        )}
      </View>
    );
  }
  return (
    <ChatBody
      code={code}
      starter={starter}
      conv={query.data.conversation}
      initialMessages={query.data.messages.map(toLocal)}
    />
  );
}
