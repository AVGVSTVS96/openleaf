import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorState, type Extension } from "@codemirror/state";
import { placeholder as cmPlaceholder, EditorView } from "@codemirror/view";
import { GFM } from "@lezer/markdown";
import {
  prosemarkBaseThemeSetup,
  prosemarkBasicSetup,
  prosemarkMarkdownSyntaxExtensions,
} from "@prosemark/core";
import { useEffect, useRef, useState } from "react";
import type { HighlighterCore } from "shiki/core";
import { createShikiPlugin } from "@/lib/codemirror/shiki-plugin";
import { getHighlighter } from "@/lib/highlighter";

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
    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
    padding: "0",
  },
  ".cm-line": {
    padding: "0",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
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
    cmPlaceholder(placeholder),
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

  return <div className="flex-1" ref={containerRef} />;
}
