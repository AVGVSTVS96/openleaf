import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { GFM } from "@lezer/markdown";
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from "@prosemark/core";
import { useEffect, useRef, useState } from "react";
import { createShikiPlugin } from "@/lib/codemirror/shiki-plugin";
import { getHighlighter } from "@/lib/highlighter";
import type { HighlighterCore } from "shiki/core";

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

const baseTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
  },
  ".cm-content": {
    fontFamily: "var(--font-mono)",
    padding: "0",
    caretColor: "var(--caret)",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--line-highlight)",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--caret)",
    borderLeftWidth: "1.5px",
  },
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
    fontStyle: "italic",
    opacity: "0.6",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--selection)",
  },
});

function buildExtensions(
  onChangeRef: React.RefObject<(markdown: string) => void>,
  placeholder: string,
  highlighter: HighlighterCore | null
): Extension[] {
  const extensions: Extension[] = [
    markdown({
      codeLanguages: languages,
      extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
    }),
    prosemarkBasicSetup(),
    prosemarkBaseThemeSetup(),
    baseTheme,
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current?.(update.state.doc.toString());
      }
    }),
    EditorView.contentAttributes.of({
      "data-placeholder": placeholder,
    }),
  ];

  if (highlighter) {
    extensions.push(createShikiPlugin(highlighter, "github-light"));
  }

  return extensions;
}

export function MarkdownEditor({
  content,
  onChange,
  placeholder = "Start writing...",
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  // Store initial values in refs to avoid re-initialization
  const initialContentRef = useRef(content);
  const placeholderRef = useRef(placeholder);
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Load Shiki highlighter
  useEffect(() => {
    getHighlighter().then(setHighlighter);
  }, []);

  // Initialize editor (recreate when highlighter loads)
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Get current content from existing view if available
    const currentContent =
      viewRef.current?.state.doc.toString() ?? initialContentRef.current;

    const state = EditorState.create({
      doc: currentContent,
      extensions: buildExtensions(
        onChangeRef,
        placeholderRef.current,
        highlighter
      ),
    });

    // Destroy previous view if exists
    viewRef.current?.destroy();

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    // Focus the editor on mount
    viewRef.current.focus();

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [highlighter]); // Recreate when highlighter loads

  // Sync content from props (for note switching)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const currentContent = view.state.doc.toString();
    if (content !== currentContent) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });
    }
  }, [content]);

  return <div ref={containerRef} className="flex-1" />;
}
