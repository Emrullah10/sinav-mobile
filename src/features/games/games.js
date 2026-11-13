// Oyun tanımları (arayüz). slug = URL parçası, key = sunucudaki game_key.
import { LayoutGrid, Search, Target, Type } from 'lucide-react-native';

export const GAMES = [
  { key: 'letter_guess', slug: 'letter-guess', icon: Type, hue: 'teal', descKey: 'games.letterGuess.desc', word: 'ODAK', ready: true },
  { key: 'word_hunt', slug: 'word-hunt', icon: Search, hue: 'indigo', descKey: 'games.wordHunt.desc', word: 'HUNT', ready: true },
  { key: 'closeness', slug: 'closeness', icon: Target, hue: 'amber', descKey: 'games.closeness.desc', word: 'NEAR', ready: true },
  { key: 'word_board', slug: 'word-board', icon: LayoutGrid, hue: 'plum', descKey: 'games.wordBoard.desc', word: 'BOARD', ready: true },
];

export const bySlug = (slug) => GAMES.find((g) => g.slug === slug) || null;
