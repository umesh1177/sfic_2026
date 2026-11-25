/**
 * Comprehensive Multi-Lingual Profanity, Abuse & Harassment Detection Engine
 * Covers English, Hindi (Devanagari + Hinglish), and Gujarati (Gujarati script + Gujarlish).
 * Includes leetspeak normalization, spaced-out letters, and phonetic variants.
 */

const ABUSIVE_PATTERNS: string[] = [
  // --- English Profanities & Abuse ---
  'fuck', 'fucking', 'fucker', 'fck', 'fuk', 'f**k', 'f*ck', 'motherfucker',
  'bitch', 'bitches', 'bitchy', 'b!tch', 'b*tch',
  'bastard', 'bastards', 'b*stard',
  'asshole', 'assholes', 'a$$hole', 'a**hole', 'dumbass', 'jackass',
  'shit', 'shitty', 'bullshit', 'sh!t', 's**t',
  'dick', 'dickhead', 'pussy', 'slut', 'whore', 'cunt', 'cock',
  'moron', 'retard', 'retarded', 'stupid idiot', 'idiot', 'scumbag',
  'kill you', 'die', 'murder', 'terrorist', 'bomb', 'suicide', 'corrupt bastard',

  // --- Hindi & Hinglish Vulgarities & Slurs ---
  'madarchod', 'maderchod', 'madarjaad', 'mc', 'm.c', 'm*c',
  'bhenchod', 'behenchod', 'behnchod', 'bc', 'b.c', 'b*c',
  'bhosdike', 'bhosdi', 'bhosadike', 'bhosada', 'bsdk',
  'chutiya', 'chutiye', 'chutiyapa', 'ch*tiya', 'chootiya', 'chutia',
  'gandu', 'gaand', 'gand', 'gaandu', 'g**d',
  'harami', 'haramkhor', 'kamina', 'kamine', 'kamini', 'kameena',
  'kutta', 'kutte', 'kuttiya', 'suar', 'suwar', 'gadhe', 'gadha',
  'saala', 'sala', 'saali', 'sali', 'sale',
  'randi', 'raand', 'r@ndi', 'r*ndi',
  'lodu', 'lauda', 'lawda', 'lavde', 'loda', 'lode',
  'jhant', 'jhat', 'bhadwa', 'bhadwe', 'bhadva', 'bhadve',
  'chinal', 'tatti', 'bakwas', 'kutte ka bacha',

  // Hindi Devanagari Script
  'मादरचोद', 'मादरચોદ', 'बहनचोद', 'बेहेनचोद', 'भोसड़ीके', 'भोसडीके', 'भोसड़ा',
  'चूतिया', 'चुतिया', 'गांडू', 'गांड', 'हरामी', 'हरामखोर', 'कमीना', 'कमीने',
  'कुत्ता', 'कुत्ते', 'साला', 'साले', 'साली', 'रांड', 'गधे', 'गधा', 'लौड़ा', 'लવड़ा', 'लोड़ा',
  'झांट', 'भड़वा', 'भड़वे', 'छिनाल', 'टट्टी', 'बकवास', 'चोर निगम',

  // --- Gujarati & Gujarlish Vulgarities & Slurs ---
  'ગાંડ', 'ગાંડુ', 'ગાંડો', 'ગાંડી', 'ગાળ', 'ગાળો',
  'હરામી', 'હરામખોર', 'કમીના', 'કમીનો', 'કમીની',
  'કુતરો', 'કુતરા', 'કુતરી', 'સાળો', 'સાળા', 'સાળી',
  'રાંડ', 'રાંડી', 'ભોસડી', 'ભોસડીના', 'લવડા', 'લવડો',
  'ચુતિયા', 'ચોદિયા', 'ચોદવું', 'ચોદ',
  'બકવાસ', 'માદરચોદ', 'બેનચોદ', 'લફંગો', 'ચોર', 'પીકી', 'પીકીના', 'ગધેડા', 'ગધેડો', 'ગધે',

  // Gujarlish phonetic variants
  'haramkhor', 'gando', 'gandi', 'chodvu', 'chod', 'kutro', 'kutra', 'bhuro',
  'lafango', 'bhosdina', 'saloo', 'radvo', 'pikina', 'piki', 'gadhe', 'gadha', 'gadheda', 'gadhedo'
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  normalized = normalized
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/\*/g, '');
  return normalized;
}

export interface ModerationCheckResult {
  isSafe: boolean;
  detectedWord?: string;
  reason?: string;
}

export function checkTextForAbuse(rawText: string): ModerationCheckResult {
  if (!rawText || rawText.trim().length === 0) {
    return { isSafe: true };
  }

  const rawLower = rawText.toLowerCase();
  const normalized = normalizeText(rawText);
  const collapsed = normalized.replace(/\s+/g, '');

  for (const word of ABUSIVE_PATTERNS) {
    const patternLower = word.toLowerCase();

    if (patternLower.length <= 4) {
      const regex = new RegExp(`(^|\\b|\\s|[^a-zA-Z0-9])${escapeRegex(patternLower)}($|\\b|\\s|[^a-zA-Z0-9])`, 'i');
      if (regex.test(rawLower) || regex.test(normalized)) {
        return {
          isSafe: false,
          detectedWord: word,
          reason: `Prohibited offensive language detected ("${word}"). Please maintain civic decency and describe the problem respectfully.`
        };
      }
    } else {
      if (rawLower.includes(patternLower) || normalized.includes(patternLower) || collapsed.includes(patternLower.replace(/\s+/g, ''))) {
        return {
          isSafe: false,
          detectedWord: word,
          reason: `Prohibited offensive language detected ("${word}"). Please maintain civic decency and describe the problem respectfully.`
        };
      }
    }
  }

  return { isSafe: true };
}

