import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const allowedProtocols = new Set(['http:', 'https:', 'mailto:']);

export interface DialogueAttribution {
  quote: string;
  speakerEntityId: string | null;
  confidence: number;
}

export interface CharacterMeta {
  id?: string;
  name: string;
  playable?: boolean;
}

// Color palette mapping based on character name hash
const AVATAR_COLORS = [
  'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-300',
  'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300',
  'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-300',
  'from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-300',
  'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300',
  'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
  'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-300',
];

function getCharacterColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  return color ?? 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-300';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter((p) => !p.startsWith('“') && !p.startsWith('"') && p.length > 0)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'NPC';
}

/**
 * Smart paragraph renderer that detects spoken dialogue quotes (“...”) and
 * renders them as stylized quote bubbles with character attribution tags.
 */
function EnhancedParagraph({
  children,
  knownCharacters,
  dialogueAttributions,
}: {
  children: React.ReactNode;
  knownCharacters?: CharacterMeta[] | undefined;
  dialogueAttributions?: DialogueAttribution[] | undefined;
}): React.JSX.Element {
  // If children is a single string, parse for quotes
  if (typeof children === 'string') {
    return <ParagraphWithQuotes text={children} knownCharacters={knownCharacters ?? []} dialogueAttributions={dialogueAttributions ?? []} />;
  }

  // If children is an array of elements or text nodes, check if any contains dialogue quotes
  const childArray = React.Children.toArray(children);
  const textContent = childArray.map((c) => (typeof c === 'string' ? c : '')).join('');

  if (textContent.includes('"') || textContent.includes('“')) {
    return <ParagraphWithQuotes text={textContent} knownCharacters={knownCharacters ?? []} dialogueAttributions={dialogueAttributions ?? []} />;
  }

  return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
}

function ParagraphWithQuotes({
  text,
  knownCharacters = [],
  dialogueAttributions = [],
}: {
  text: string;
  knownCharacters?: CharacterMeta[];
  dialogueAttributions?: DialogueAttribution[];
}): React.JSX.Element {
  // Regex to match quotes: both double quotes "..." and curly quotes “...”
  const quoteRegex = /(["“][^"”]+["”])/g;
  const parts = text.split(quoteRegex);

  if (parts.length <= 1) {
    return <p className="mb-4 last:mb-0 leading-relaxed">{text}</p>;
  }

  // Attempt to identify who said what by looking at neighboring lead-ins or dialogue tags
  // Example patterns:
  // "Danielle says, ..."
  // "... says Danielle"
  // "Lena asks, ..."
  // "She turns to you. '...'"
  const characterNames = knownCharacters
    .map((c) => {
      const clean = c.name.replace(/["“”]/g, '').trim();
      const first = clean.split(' ')[0] || '';
      return { full: clean, first, char: c };
    })
    .filter((c) => c.first.length > 1);

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const isQuote = (part.startsWith('"') && part.endsWith('"')) || (part.startsWith('“') && part.endsWith('”'));

    if (isQuote) {
      const cleanQuote = part.slice(1, -1);
      // Look at previous part and next part for attribution clues
      const prevContext = parts[i - 1] || '';
      const nextContext = parts[i + 1] || '';
      const contextWindow = `${prevContext.slice(-60)} ${nextContext.slice(0, 60)}`;

      // Prefer the asynchronous LLM attribution when available; fall back to local heuristics.
      let speaker: CharacterMeta | undefined;
      const normalizedQuote = cleanQuote.replace(/\s+/g, ' ').trim().toLowerCase();
      const attributed = dialogueAttributions.find(
        (item) => item.quote.replace(/\s+/g, ' ').trim().toLowerCase() === normalizedQuote,
      );
      if (attributed?.speakerEntityId) {
        speaker = knownCharacters.find((character) => character.id === attributed.speakerEntityId);
      }
      if (!speaker) {
        for (const cn of characterNames) {
          const regex = new RegExp(`\\b(${cn.first}|${cn.full})\\b`, 'i');
          if (regex.test(contextWindow)) {
            speaker = cn.char;
            break;
          }
        }
      }

      const speakerName = speaker?.name?.replace(/["“”]/g, '') || null;
      const colorStyle = speakerName ? getCharacterColor(speakerName) : 'from-indigo-500/10 to-transparent border-indigo-500/30 text-indigo-300';
      const initials = speakerName ? getInitials(speakerName) : '“';

      elements.push(
        <div key={i} className="my-3 px-1">
          <div className={`relative rounded-xl border bg-gradient-to-r ${colorStyle} p-3.5 shadow-sm transition-all`}>
            {speakerName && (
              <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-border/30">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-background/80 text-[10px] font-bold ring-1 ring-border/50">
                  {initials}
                </span>
                <span className="text-xs font-semibold tracking-wide uppercase text-foreground/90 font-sans">
                  {speakerName}
                </span>
              </div>
            )}
            <p className="text-[16px] font-serif italic text-foreground leading-relaxed">
              “{cleanQuote}”
            </p>
          </div>
        </div>
      );
    } else {
      const trimmed = part.trim();
      if (trimmed) {
        elements.push(
          <span key={i} className="leading-relaxed">
            {part}
          </span>
        );
      }
    }
  }

  return <div className="mb-4 last:mb-0 space-y-2">{elements}</div>;
}

export function SafeMarkdown({
  children,
  className = '',
  knownCharacters = [],
  dialogueAttributions = [],
}: {
  children: string;
  className?: string;
  knownCharacters?: CharacterMeta[];
  dialogueAttributions?: DialogueAttribution[];
}): React.JSX.Element {
  return (
    <div className={`prose prose-invert max-w-none text-foreground/90 leading-relaxed font-serif text-[17px] space-y-4 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          p: ({ children: pChildren }) => (
            <EnhancedParagraph
              knownCharacters={knownCharacters}
              dialogueAttributions={dialogueAttributions}
            >
              {pChildren}
            </EnhancedParagraph>
          ),
          blockquote: ({ children: bChildren }) => (
            <blockquote className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground my-2">
              {bChildren}
            </blockquote>
          ),
          a: ({ href, children: linkChildren }) => {
            let safeHref: string | undefined;
            try {
              if (href) {
                const url = new URL(href, window.location.origin);
                if (allowedProtocols.has(url.protocol)) safeHref = url.toString();
              }
            } catch {
              safeHref = undefined;
            }
            return safeHref ? (
              <a href={safeHref} rel="noreferrer noopener" className="text-primary underline underline-offset-4 hover:opacity-80">
                {linkChildren}
              </a>
            ) : (
              <span>{linkChildren}</span>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
