import ruby from '../rubySnippets.json';
import stories from '../practicePassages.json';

type CuratedPassage = { id: string; title: string; language: string; passage: string; attribution: string; description?: string; sourceUrl?: string; author?: string };

export const curatedPassages: CuratedPassage[] = [
  { id: 'steady-rhythm', title: 'A steady rhythm', language: 'prose',
    passage: 'Good work starts with a clear idea and improves with patient attention. Take your time, correct your mistakes, and let a steady rhythm carry you to the end.',
    attribution: 'Typearchy original passage' },
  { id: 'small-discoveries', title: 'Small discoveries', language: 'prose',
    passage: 'The walk home took a little longer than usual. A bird had built its nest above the old shop door, and a small crowd stopped to watch. Sometimes the best part of a familiar day is noticing something new.',
    attribution: 'Typearchy original passage' },
  { id: 'clear-feedback', title: 'Clear feedback', language: 'prose',
    passage: 'Clear feedback makes deliberate practice useful.', attribution: 'Typearchy original passage' },
  ...stories,
  ...ruby.map(snippet => ({ id: snippet.id, title: snippet.title, language: snippet.language,
    passage: snippet.passage, description: snippet.description, sourceUrl: snippet.sourceUrl, author: snippet.author, attribution: `${snippet.author}. Rails (MIT). ${snippet.sourceUrl}` })),
];

export function isCuratedPassage(value: { title: string; language: string; passage: string; attribution: string }) {
  return curatedPassages.some(passage => passage.title === value.title && passage.language === value.language
    && passage.passage === value.passage && passage.attribution === value.attribution);
}
