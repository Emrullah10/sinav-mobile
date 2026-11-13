// ÜRETİLDİ — elle düzenleme. Kaynak: sinav-mono-repo (npm run sync:mobile).
// ÜRETİLDİ: node packages/i18n/build-index.mjs
import apiErrorsBillingKeys from './keys/apiErrorsBillingKeys.js';
import apiErrorsCommonKeys from './keys/apiErrorsCommonKeys.js';
import apiErrorsContentKeys from './keys/apiErrorsContentKeys.js';
import apiErrorsGamesKeys from './keys/apiErrorsGamesKeys.js';
import apiErrorsIdentityKeys from './keys/apiErrorsIdentityKeys.js';
import apiErrorsLearningKeys from './keys/apiErrorsLearningKeys.js';
import apiErrorsTutorKeys from './keys/apiErrorsTutorKeys.js';
import backgroundKeys from './keys/backgroundKeys.js';
import enumsBillingKeys from './keys/enumsBillingKeys.js';
import enumsContentKeys from './keys/enumsContentKeys.js';
import enumsGamesKeys from './keys/enumsGamesKeys.js';
import enumsLearningKeys from './keys/enumsLearningKeys.js';
import enumsTutorKeys from './keys/enumsTutorKeys.js';
import feedbackKeys from './keys/feedbackKeys.js';
import gamesBoardKeys from './keys/gamesBoardKeys.js';
import gamesCloseKeys from './keys/gamesCloseKeys.js';
import gamesHuntKeys from './keys/gamesHuntKeys.js';
import gamesKeys from './keys/gamesKeys.js';
import helpKeys from './keys/helpKeys.js';
import lexiconKeys from './keys/lexiconKeys.js';
import readingKeys from './keys/readingKeys.js';

export const keys = { ...apiErrorsBillingKeys, ...apiErrorsCommonKeys, ...apiErrorsContentKeys, ...apiErrorsGamesKeys, ...apiErrorsIdentityKeys, ...apiErrorsLearningKeys, ...apiErrorsTutorKeys, ...backgroundKeys, ...enumsBillingKeys, ...enumsContentKeys, ...enumsGamesKeys, ...enumsLearningKeys, ...enumsTutorKeys, ...feedbackKeys, ...gamesBoardKeys, ...gamesCloseKeys, ...gamesHuntKeys, ...gamesKeys, ...helpKeys, ...lexiconKeys, ...readingKeys };
const pick = (lang) => Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, v[lang] ?? v.tr]));
export const resources = { tr: { translation: pick('tr') }, en: { translation: pick('en') } };
export default resources;
