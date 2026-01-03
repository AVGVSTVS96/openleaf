import { syntaxTree } from "@codemirror/language";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { HighlighterCore } from "shiki/core";

/**
 * CodeMirror 6 plugin that applies Shiki syntax highlighting to fenced code blocks.
 */
export function createShikiPlugin(
  highlighter: HighlighterCore,
  theme: string = "github-light"
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const decorations: ReturnType<typeof Decoration.mark>[] = [];

        for (const { from, to } of view.visibleRanges) {
          syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
              // FencedCode is the node type for ```code``` blocks
              if (node.name === "FencedCode") {
                let language = "text";
                let codeStart = node.from;
                let codeEnd = node.to;

                // Find CodeInfo (language) and CodeText (content) child nodes
                let child = node.node.firstChild;
                while (child) {
                  if (child.name === "CodeInfo") {
                    language = view.state.doc.sliceString(child.from, child.to);
                  }
                  if (child.name === "CodeText") {
                    codeStart = child.from;
                    codeEnd = child.to;
                  }
                  child = child.nextSibling;
                }

                const code = view.state.doc.sliceString(codeStart, codeEnd);
                if (!code.trim()) return;

                // Check if language is loaded, fall back to plaintext
                const loadedLangs = highlighter.getLoadedLanguages();
                const langToUse = loadedLangs.includes(language)
                  ? language
                  : "plaintext";

                try {
                  const { tokens } = highlighter.codeToTokens(code, {
                    lang: langToUse,
                    theme,
                  });

                  let pos = codeStart;
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
                    pos++; // newline
                  }
                } catch {
                  // Highlighting failed, skip (shows unstyled code)
                }
              }
            },
          });
        }

        return Decoration.set(decorations, true);
      }
    },
    { decorations: (v) => v.decorations }
  );
}
