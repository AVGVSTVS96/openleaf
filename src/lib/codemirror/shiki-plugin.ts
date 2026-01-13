import { syntaxTree } from "@codemirror/language";
import type { Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { HighlighterCore, ThemedToken } from "shiki/core";

interface CodeBlockInfo {
  language: string;
  codeStart: number;
  codeEnd: number;
}

function parseCodeBlock(
  node: { from: number; to: number; node: { firstChild: unknown } },
  doc: { sliceString: (from: number, to: number) => string }
): CodeBlockInfo {
  let language = "text";
  let codeStart = node.from;
  let codeEnd = node.to;

  let child = node.node.firstChild as {
    name: string;
    from: number;
    to: number;
    nextSibling: unknown;
  } | null;

  while (child) {
    if (child.name === "CodeInfo") {
      language = doc.sliceString(child.from, child.to);
    }
    if (child.name === "CodeText") {
      codeStart = child.from;
      codeEnd = child.to;
    }
    child = child.nextSibling as typeof child;
  }

  return { language, codeStart, codeEnd };
}

function createTokenDecorations(
  tokens: ThemedToken[][],
  startPos: number
): Range<Decoration>[] {
  const decorations: Range<Decoration>[] = [];
  let pos = startPos;

  for (const line of tokens) {
    for (const token of line) {
      const tokenEnd = pos + token.content.length;
      if (token.color) {
        decorations.push(
          Decoration.mark({
            attributes: { style: `color: ${token.color}` },
          }).range(pos, tokenEnd)
        );
      }
      pos = tokenEnd;
    }
    pos++;
  }

  return decorations;
}

function highlightCodeBlock(
  highlighter: HighlighterCore,
  code: string,
  language: string,
  theme: string,
  startPos: number
): Range<Decoration>[] {
  const loadedLangs = highlighter.getLoadedLanguages();
  const langToUse = loadedLangs.includes(language) ? language : "plaintext";

  try {
    const { tokens } = highlighter.codeToTokens(code, {
      lang: langToUse,
      theme,
    });
    return createTokenDecorations(tokens, startPos);
  } catch {
    return [];
  }
}

/**
 * CodeMirror 6 plugin that applies Shiki syntax highlighting to fenced code blocks.
 * Reads theme from DOM (checks for .dark class on documentElement).
 * Watches for theme changes and rebuilds decorations automatically.
 */
export function createShikiPlugin(highlighter: HighlighterCore) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      view: EditorView;
      observer: MutationObserver;
      currentTheme: string;

      constructor(view: EditorView) {
        this.view = view;
        this.currentTheme = this.getTheme();
        this.decorations = this.buildDecorations(view);

        // Watch for theme changes on <html> element
        this.observer = new MutationObserver(() => {
          const newTheme = this.getTheme();
          if (newTheme !== this.currentTheme) {
            this.currentTheme = newTheme;
            this.decorations = this.buildDecorations(this.view);
            this.view.dispatch({}); // Trigger re-render
          }
        });
        this.observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      destroy() {
        this.observer.disconnect();
      }

      getTheme(): string {
        return document.documentElement.classList.contains("dark")
          ? "github-dark"
          : "github-light";
      }

      buildDecorations(view: EditorView): DecorationSet {
        const decorations: Range<Decoration>[] = [];

        for (const { from, to } of view.visibleRanges) {
          syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
              if (node.name !== "FencedCode") {
                return;
              }

              const { language, codeStart, codeEnd } = parseCodeBlock(
                node,
                view.state.doc
              );
              const code = view.state.doc.sliceString(codeStart, codeEnd);

              if (!code.trim()) {
                return;
              }

              const blockDecorations = highlightCodeBlock(
                highlighter,
                code,
                language,
                this.currentTheme,
                codeStart
              );
              decorations.push(...blockDecorations);
            },
          });
        }

        return Decoration.set(decorations, true);
      }
    },
    { decorations: (v) => v.decorations }
  );
}
