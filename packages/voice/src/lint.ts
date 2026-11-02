/**
 * The voice linter. Anything a model writes for Grandma passes through here
 * before a person sees it. One violation and that line is replaced with a
 * hand-written one from the bank.
 */

const BANNED: { pattern: RegExp; why: string }[] = [
  // Mock-accent spellings and caricature phrases.
  { pattern: /\b(velly|solly|rotsa|herro|ah so|so solly|me so|you rike|flied lice|chop[- ]chop|me love you|long time)\b/i, why: "accent caricature" },
  { pattern: /\b(confucius (say|says)|ancient (chinese|oriental|eastern) (secret|wisdom|proverb)|fortune cookie|oriental|dragon lady|tiger mom|kung ?fu|ching ?chong|chinky?|gong)\b/i, why: "stereotype" },
  { pattern: /\b(wise old|old proverb says|as the saying goes in)\b/i, why: "fake proverb" },
  // Insults aimed at the person rather than the room.
  { pattern: /\b(stupid|idiot|dumb|moron|lazy|slob|pig|pigsty|fat|ugly|loser|pathetic|worthless|disgusting|gross person|failure)\b/i, why: "insult" },
  { pattern: /\b(you people|your kind|people like you)\b/i, why: "othering" },
  // Bodies and people in the photo are off limits.
  { pattern: /\b(your (body|weight|face|hair|skin|outfit|clothes)|you look)\b/i, why: "comments on a person" },
  { pattern: /\b(he|she|they)('s| is| are) (sleeping|lying|sitting|standing) (there|in)\b/i, why: "comments on a person in the photo" },
  // Profanity.
  { pattern: /\b(fuck|shit|bitch|damn|hell|crap|ass|bastard)\b/i, why: "profanity" },
  // Faux-authority and medical claims.
  { pattern: /\b(guarantee[sd]?|cure[sd]?|will make you (rich|healthy|lucky)|bad luck will|you will die|death)\b/i, why: "overclaiming" },
  // Model tells.
  { pattern: /\b(as an ai|language model|i cannot|i'm unable|i am unable|feng shui principles suggest)\b/i, why: "breaks character" },
];

const EMOJI = /\p{Extended_Pictographic}/u;

export interface LintOptions {
  max?: number;
  min?: number;
}

export function lint(text: string, opts: LintOptions = {}): string[] {
  const problems: string[] = [];
  const t = text.trim();
  if (t.length < (opts.min ?? 2)) problems.push("too short");
  if (opts.max && t.length > opts.max) problems.push(`longer than ${opts.max}`);
  if (EMOJI.test(t)) problems.push("emoji");
  if (/[<>{}\[\]`]/.test(t)) problems.push("markup");
  if (/https?:|www\./i.test(t)) problems.push("link");
  for (const { pattern, why } of BANNED) if (pattern.test(t)) problems.push(why);
  return problems;
}

export const isClean = (text: string, opts?: LintOptions) => lint(text, opts).length === 0;
