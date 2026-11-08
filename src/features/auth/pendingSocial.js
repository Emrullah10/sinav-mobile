// Girişte kayıtlı olmayan Google/Apple jetonu kayıt ekranına (onay adımı) bellekte taşınır; rota parametresine konmaz.
let pending = null;
export const setPendingSocial = (tok) => { pending = tok; };
export const takePendingSocial = () => {
  const tok = pending;
  pending = null;
  return tok;
};
