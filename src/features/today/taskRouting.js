import { deepLinks } from '@shared/navigation/deepLinks';

/** plan-task start yanıtı -> açılacak rota (null: açılacak bir şey yok). */
export const routeForTaskStart = (res) => {
  if (!res) return null;
  const kind = res.task?.kind;
  if (res.empty) return null;
  switch (kind) {
    case 'practice':
    case 'error_review':
      return res.session?.code ? deepLinks.question(res.session.code) : null;
    case 'vocab_review':
      return res.session?.code
        ? { pathname: deepLinks.vocabReview, params: { session: String(res.session.code) } }
        : deepLinks.vocabReview;
    case 'diagnostic':
      return deepLinks.diagnostic;
    case 'note':
      return res.note?.itemCode ? deepLinks.note(res.note.itemCode) : null;
    case 'mock_exam':
      return res.exam?.formCode ? `/deneme/form/${res.exam.formCode}` : '/deneme';
    case 'translation':
      return '/ogretmen/ceviri';
    default:
      return null;
  }
};
