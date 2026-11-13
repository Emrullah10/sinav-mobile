// ÜRETİLDİ — elle düzenleme. Kaynak: sinav-mono-repo (npm run sync:mobile).
// games servisi uçları (docs/api/games.md). Dönüş: axios yanıtı; gövde { success, data }.
export const createGamesApi = (http, { api = '/api' } = {}) => {
  const B = `${api}/sinav-service-games/v1`;
  return {
    gamesHubGet: () => http.get(`${B}/hub`),
    gamesLevelsGet: (game) => http.get(`${B}/levels/${game}`),
    gamesLeaderboardGet: (game, params) => http.get(`${B}/leaderboards/${game}`, { params }),
    gamesMatchesList: () => http.get(`${B}/matches`),
    gamesMatchCreate: (game) => http.post(`${B}/matches`, { game }),
    gamesMatchJoin: (inviteCode) => http.post(`${B}/matches/join`, { inviteCode }),
    gamesMatchmake: (game) => http.post(`${B}/matchmaking`, { game }),
    gamesMatchmakeCancel: (code) => http.delete(`${B}/matchmaking/${code}`),
    gamesMatchGet: (code, since) => http.get(`${B}/matches/${code}`, since ? { params: { since } } : undefined),
    gamesMatchMove: (code, body) => http.post(`${B}/matches/${code}/moves`, body),
    gamesMatchReact: (code, reaction) => http.post(`${B}/matches/${code}/reactions`, { reaction }),
    gamesMatchResign: (code) => http.post(`${B}/matches/${code}/resign`, {}),
    gamesPlayStart: (body) => http.post(`${B}/plays`, body),
    gamesPlayGet: (code) => http.get(`${B}/plays/${code}`),
    gamesPlayMove: (code, body) => http.post(`${B}/plays/${code}/moves`, body),
  };
};
