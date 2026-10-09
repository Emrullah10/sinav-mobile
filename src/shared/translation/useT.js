import { useTranslation } from 'react-i18next';

/** t(key, opts) ve geçerli dil. Bileşenlerde `const { t } = useT()`. */
export const useT = () => {
  const { t, i18n } = useTranslation();
  return { t, language: i18n.language, changeLanguage: i18n.changeLanguage };
};
