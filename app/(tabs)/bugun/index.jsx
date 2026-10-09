import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Flame, MoreHorizontal, Settings2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import {
  Banner, Button, Card, Chip, ErrorState, IconButton, ListRow, ProgressBar, ProgressRing,
  Screen, Sheet, Skeleton, Text, TopBar, useToast,
} from '@components';
import { api } from '@api';
import { apiErrorCode, errorText, formatDate, unwrap } from '@shared/api/helpers';
import { errorKind } from '@shared/api/helpers';
import { useAuthStore } from '@shared/auth/authStore';
import { queryKeys } from '@shared/vendor/client-sdk/index.js';
import { routeForTaskStart } from '@features/today/taskRouting';
import { useT } from '@shared/translation/useT';
import { useTheme } from '@theme';

const WEEKDAY_FORMAT = { weekday: 'short' };

function GoalCard({ data }) {
  const { t } = useT();
  const { colors } = useTheme();
  const { goal } = data;
  const value = goal.minutes ? Math.min(1, goal.activeMinutes / goal.minutes) : 0;
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <ProgressRing value={value} size={96} tone={goal.met ? 'success' : 'accent'} accessibilityLabel={t('today.goal.title')}>
        {goal.met ? <Check size={32} color={colors.success.fg} /> : <Text variant="numeric-m">{`${Math.round(value * 100)}%`}</Text>}
      </ProgressRing>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="heading-3">{t('today.goal.title')}</Text>
        <Text variant="body-m" color="secondary">
          {goal.met ? t('today.goal.met') : t('today.goal.progress', { done: goal.activeMinutes, goal: goal.minutes })}
        </Text>
        <Text variant="caption" color="tertiary">
          {t('today.goal.stats', { q: goal.questionsAnswered, c: goal.cardsReviewed })}
        </Text>
      </View>
    </Card>
  );
}

function StreakCard({ streak }) {
  const { t, language } = useT();
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Flame size={24} color={colors.reward.icon} />
        <Text variant="heading-3" style={{ flex: 1 }}>
          {t('today.streak.title')}
        </Text>
        <Text variant="numeric-m">{t('today.streak.days', { n: streak.current })}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {streak.week.map((d) => {
          const label = formatDate(d.date, language, WEEKDAY_FORMAT);
          return (
            <View
              key={d.date}
              accessible
              accessibilityLabel={t(d.active ? 'today.streak.dayActive' : 'today.streak.dayInactive', { day: label })}
              style={{ alignItems: 'center', gap: 4 }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: d.active ? colors.accent.default : colors.bg.canvas,
                  borderWidth: d.isToday ? 2 : 1,
                  borderColor: d.isToday ? colors.accent.default : colors.border.default,
                }}
              >
                {d.active ? <Check size={16} color={colors.text['on-accent']} /> : null}
              </View>
              <Text variant="caption" color={d.isToday ? 'accent' : 'tertiary'}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      {streak.atRisk ? (
        <Text variant="body-s" color="warning">
          {t('today.streak.atRisk')}
        </Text>
      ) : null}
      {streak.freezes > 0 ? (
        <Text variant="caption" color="tertiary">
          {t('today.streak.freezes', { n: streak.freezes })}
        </Text>
      ) : null}
    </Card>
  );
}

function EstimateCard({ data }) {
  const { t } = useT();
  const { estimate, enrollment } = data;
  return (
    <Card style={{ gap: 4 }}>
      <Text variant="overline" color="tertiary">
        {t('today.estimate.title')}
      </Text>
      {estimate ? (
        <Text variant="numeric-l">{t('today.estimate.range', { low: estimate.low, high: estimate.high })}</Text>
      ) : (
        <Text variant="body-m" color="secondary">
          {t('today.estimate.none')}
        </Text>
      )}
      <Text variant="body-s" color="secondary">
        {[
          enrollment?.targetScore ? t('today.estimate.target', { score: enrollment.targetScore }) : null,
          enrollment?.daysToExam != null ? t('today.estimate.daysLeft', { n: enrollment.daysToExam }) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </Card>
  );
}

function TaskRow({ task, onStart, onMore, starting, isNext }) {
  const { t } = useT();
  const { colors } = useTheme();
  const open = task.status === 'pending' || task.status === 'in_progress';
  const title = `${t(`enums.plan_task_kind.${task.kind}`)}${task.questionType ? ` · ${task.questionType.name}` : task.skill ? ` · ${task.skill.name}` : ''}`;
  const reason = t(`enums.plan_task_reason.${task.reason}`, { defaultValue: '' });
  const status =
    task.status === 'completed' ? t('today.task.done') : task.status === 'skipped' ? t('today.task.skipped') : task.status === 'postponed' ? t('today.task.postponed') : null;
  return (
    <View style={{ gap: 8, paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" color={open ? 'primary' : 'tertiary'}>
            {title}
          </Text>
          <Text variant="body-s" color="secondary">
            {[reason, t('today.plan.minutes', { n: task.estimatedMinutes })].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {open ? (
          <IconButton icon={MoreHorizontal} size={36} onPress={() => onMore(task)} accessibilityLabel={t('today.task.more')} />
        ) : status ? (
          <Text variant="label-s" style={{ color: task.status === 'completed' ? colors.success.fg : colors.text.tertiary }}>
            {status}
          </Text>
        ) : null}
      </View>
      {task.status === 'in_progress' && task.progressPct ? <ProgressBar value={task.progressPct / 100} /> : null}
      {open ? (
        <Button
          title={task.status === 'in_progress' ? t('today.task.resume') : t('today.task.start')}
          variant={isNext ? 'primary' : 'secondary'}
          size="md"
          fullWidth={false}
          loading={starting}
          onPress={() => onStart(task)}
        />
      ) : null}
    </View>
  );
}

export default function TodayScreen() {
  const { t, language } = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const sheet = useRef(null);
  const taskSheet = useRef(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const query = useQuery({
    queryKey: queryKeys.learning.today(),
    queryFn: async () => unwrap(await api.learningTodayGet()),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.learning.today() });

  const start = useMutation({
    mutationFn: async (task) => unwrap(await api.learningPlanTaskStart(task.code)),
    onSuccess: (res) => {
      invalidate();
      const route = routeForTaskStart(res);
      if (route) router.push(route);
      else if (res.exam?.locked) toast.show({ message: t('today.task.locked') });
      else toast.show({ message: t('today.task.empty') });
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const postpone = useMutation({
    mutationFn: async (task) => unwrap(await api.learningPlanTaskPostpone(task.code)),
    onSuccess: (res) => {
      invalidate();
      toast.show({ message: t('today.task.postponedTo', { date: formatDate(res.movedTo?.date, language) }) });
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const skip = useMutation({
    mutationFn: async (task) => unwrap(await api.learningPlanTaskSkip(task.code)),
    onSuccess: invalidate,
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });
  const adjust = useMutation({
    mutationFn: async (body) => unwrap(await api.learningPlanAdjust(body)),
    onSuccess: (res) => {
      invalidate();
      sheet.current?.dismiss();
      toast.show({
        message: res.freeze?.freezeUsed ? t('today.adjust.freezeUsed') : res.freeze?.streakAtRisk ? t('today.adjust.atRisk') : t('today.adjust.done'),
      });
    },
    onError: (e) => toast.show({ message: errorText(t, e), tone: 'danger' }),
  });

  const header = (
    <TopBar
      variant="large"
      title={user?.displayName ? t('today.greeting', { name: user.displayName }) : t('today.greetingAnon')}
      right={<IconButton icon={Settings2} onPress={() => sheet.current?.present()} accessibilityLabel={t('today.adjust.title')} />}
    />
  );

  if (query.isError && apiErrorCode(query.error) === 'ENROLLMENT_REQUIRED') {
    router.replace('/baslangic');
    return <Screen header={header} />;
  }

  return (
    <Screen header={header} onRefresh={() => query.refetch()} refreshing={query.isRefetching && !query.isPending}>
      {query.isPending ? (
        <View style={{ gap: 12 }}>
          <Skeleton height={128} />
          <Skeleton height={112} />
          <Skeleton height={160} />
        </View>
      ) : query.isError ? (
        <ErrorState kind={errorKind(query.error)} onRetry={() => query.refetch()} />
      ) : (
        (() => {
          const data = query.data;
          const day = data.day;
          const tasks = day?.tasks || [];
          const nextCode = data.nextTaskCode;
          const settled = data.streak.settled;
          return (
            <View style={{ gap: 12 }}>
              {settled?.broken ? <Banner tone="warning" message={t('today.settled.broken')} /> : settled?.freezesUsed ? <Banner tone="info" message={t('today.settled.freeze', { n: settled.freezesUsed })} /> : null}
              {data.access.tier === 'free' ? (
                <Banner
                  tone="info"
                  message={t('today.access.free', { n: data.usage?.questionsPerDay?.remaining ?? 0 })}
                  action={{ label: t('today.access.upgrade'), onPress: () => router.push('/premium') }}
                />
              ) : null}
              <GoalCard data={data} />
              <Card style={{ gap: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="heading-2">{t('today.plan.title')}</Text>
                  {day ? (
                    <Text variant="label-m" color="secondary">
                      {t('today.plan.minutes', { n: day.plannedMinutes })}
                    </Text>
                  ) : null}
                </View>
                {tasks.length === 0 ? (
                  <Text variant="body-m" color="secondary" style={{ marginTop: 8 }}>
                    {day?.status === 'rest' ? t('today.plan.rest') : t('today.plan.empty')}
                  </Text>
                ) : (
                  tasks.map((task, i) => (
                    <View key={task.code} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border.subtle } : null}>
                      <TaskRow
                        task={task}
                        isNext={task.code === nextCode}
                        starting={start.isPending && start.variables?.code === task.code}
                        onStart={(tk) => start.mutate(tk)}
                        onMore={(tk) => {
                          setSelectedTask(tk);
                          taskSheet.current?.present();
                        }}
                      />
                    </View>
                  ))
                )}
              </Card>
              <StreakCard streak={data.streak} />
              <EstimateCard data={data} />
              {data.due.cards > 0 || data.due.mistakes > 0 ? (
                <Card style={{ gap: 4 }}>
                  <Text variant="heading-3">{t('today.due.title')}</Text>
                  {data.due.cards > 0 ? (
                    <ListRow title={t('today.due.cards', { n: data.due.cards })} onPress={() => router.push('/kelimeler/tekrar')} />
                  ) : null}
                  {data.due.mistakes > 0 ? (
                    <ListRow title={t('today.due.mistakes', { n: data.due.mistakes })} onPress={() => router.push('/calis/hatalar')} />
                  ) : null}
                </Card>
              ) : null}
            </View>
          );
        })()
      )}

      <Sheet ref={sheet} title={t('today.adjust.title')}>
        <Text variant="title" style={{ marginBottom: 8 }}>
          {t('today.adjust.shortDay')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {[10, 20, 30].map((m) => (
            <Chip key={m} label={t('today.adjust.minutes', { n: m })} onPress={() => adjust.mutate({ shortDay: { minutes: m } })} />
          ))}
        </View>
        <ListRow title={t('today.adjust.skipDay')} onPress={() => adjust.mutate({ skipDay: true })} divider />
        <ListRow title={t('today.adjust.reset')} onPress={() => adjust.mutate({ reset: true })} />
      </Sheet>
      <Sheet ref={taskSheet} title={t('today.task.more')}>
        <ListRow
          title={t('today.task.postpone')}
          onPress={() => {
            taskSheet.current?.dismiss();
            if (selectedTask) postpone.mutate(selectedTask);
          }}
          divider
        />
        <ListRow
          title={t('today.task.skip')}
          onPress={() => {
            taskSheet.current?.dismiss();
            if (selectedTask) skip.mutate(selectedTask);
          }}
        />
      </Sheet>
    </Screen>
  );
}
