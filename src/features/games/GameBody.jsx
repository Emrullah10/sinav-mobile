import { ClosenessScreen } from './ClosenessScreen';
import { LetterGuessScreen } from './LetterGuessScreen';
import { WordBoardScreen } from './WordBoardScreen';
import { WordHuntScreen } from './WordHuntScreen';

/** Oyun anahtarına göre ekran; anahtar değişince bileşen sıfırlanır. */
export function GameBody({ g, kind, level, tick = '', matchCode }) {
  const k = `${g.key}:${kind}:${level}:${tick}:${matchCode || ''}`;
  if (g.key === 'word_board') return <WordBoardScreen key={k} kind={kind} level={level} matchCode={matchCode} />;
  if (g.key === 'closeness') return <ClosenessScreen key={k} kind={kind} level={level} matchCode={matchCode} />;
  if (g.key === 'word_hunt') return <WordHuntScreen key={k} kind={kind} level={level} matchCode={matchCode} />;
  return <LetterGuessScreen key={k} kind={kind} level={level} matchCode={matchCode} />;
}
