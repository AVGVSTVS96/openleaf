import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { GFM } from "@lezer/markdown";
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from "@prosemark/core";
import { useEffect, useRef } from "react";

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
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

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const state = EditorState.create({
      doc: initialContentRef.current,
      extensions: [
        markdown({
          codeLanguages: languages,
          extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
        }),
        prosemarkBasicSetup(),
        prosemarkBaseThemeSetup(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
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
        }),
        EditorView.contentAttributes.of({
          "data-placeholder": placeholderRef.current,
        }),
      ],
    });

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
  }, []);

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
