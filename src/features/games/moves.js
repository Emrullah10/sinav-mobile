import { api } from '@api';

/** Hamleyi doğru uca yollar: çevrimiçi maçta `matches`, tek kişilikte `plays`. */
export const sendMove = (play, code, body) => (play?.kind === 'match' ? api.gamesMatchMove(code, body) : api.gamesPlayMove(code, body));
