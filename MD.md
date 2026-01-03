# Markdown Live Preview Implementation Plan

## Overview

Implement a **Typora-style** live preview markdown editor for OpenLeaf using **ProseMark** (CodeMirror 6 extensions) with **Shiki** for code block syntax highlighting.

The editor will:
- Show markdown syntax (`###`, `**`, etc.) when cursor is on that line
- Hide syntax and show rendered formatting when cursor moves away
- Use Shiki for beautiful code block highlighting

## Technical Approach

### Why ProseMark?

- **Typora-style out of the box**: Syntax show/hide already implemented
- **CodeMirror 6 based**: Modern, performant, text-native
- **Extensible**: Can add Shiki plugin alongside it
- **MIT licensed**: Free to use and fork

### Architecture

```
User types markdown → CM6 stores raw text → ProseMark hides/shows syntax
                           ↓
                    Shiki highlights code blocks
                           ↓
                    doc.toString() returns raw markdown for encryption
```

The editor stores content as **raw markdown strings** - no conversion needed.

## Dependencies

### Phase 1 (ProseMark editor)
```bash
bun add @prosemark/core @codemirror/view @codemirror/state @codemirror/lang-markdown @codemirror/language @codemirror/language-data @lezer/markdown
```

### Phase 2 (Shiki highlighting)
```bash
bun add shiki
```

| Package | Purpose |
|---------|---------|
| `@prosemark/core` | Typora-style show/hide extensions |
| `@codemirror/view` | CM6 view layer |
| `@codemirror/state` | CM6 state management |
| `@codemirror/lang-markdown` | Markdown language support |
| `@codemirror/language` | Language infrastructure |
| `@codemirror/language-data` | Code block language detection |
| `@lezer/markdown` | GFM support |
| `shiki` | Code block syntax highlighting |

## Implementation

### Phase 1: Basic Editor with ProseMark

#### 1.1 Install dependencies

```bash
bun add @prosemark/core @codemirror/view @codemirror/state @codemirror/lang-markdown @codemirror/language @codemirror/language-data @lezer/markdown
```

#### 1.2 Create editor component

Create `src/components/notes/MarkdownEditor.tsx`:

```tsx
import { useEffect, useRef, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { GFM } from '@lezer/markdown'
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core'

interface MarkdownEditorProps {
  content: string
  onChange: (markdown: string) => void
  placeholder?: string
}

export function MarkdownEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: content,
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
            onChangeRef.current(update.state.doc.toString())
          }
        }),
        // Placeholder
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-content': {
            fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
            padding: '0',
          },
          '.cm-line': {
            padding: '0',
          },
          '&.cm-focused': {
            outline: 'none',
          },
          '.cm-placeholder': {
            color: 'var(--muted-foreground)',
          },
        }),
        EditorView.contentAttributes.of({ 
          'data-placeholder': placeholder 
        }),
      ],
    })

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, []) // Only run once on mount

  // Sync content from props (for note switching)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (content !== currentContent) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      })
    }
  }, [content])

  return <div ref={containerRef} className="flex-1" />
}
```

#### 1.3 Add ProseMark CSS variables

Add to `src/styles/global.css`:

```css
/* ProseMark theme customization */
:root {
  --pm-header-mark-color: var(--muted-foreground);
  --pm-link-color: var(--destructive);
  --pm-muted-color: var(--muted-foreground);
  --pm-code-background-color: var(--muted);
  --pm-blockquote-vertical-line-background-color: var(--border);
  --pm-cursor-color: var(--foreground);
}

/* Editor container */
.cm-editor {
  height: 100%;
}

.cm-editor .cm-scroller {
  font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace;
  line-height: 1.7;
}

/* Placeholder styling */
.cm-editor .cm-content[data-placeholder]:empty::before {
  content: attr(data-placeholder);
  color: var(--muted-foreground);
  pointer-events: none;
  position: absolute;
}
```

#### 1.4 Integrate into NoteEditor

Update `src/components/notes/NoteEditor.tsx` to use `MarkdownEditor` instead of `<textarea>`.

---

### Phase 2: Code Block Highlighting with Shiki

#### 2.1 Install Shiki

```bash
bun add shiki
```

#### 2.2 Create highlighter singleton

Create `src/lib/highlighter.ts`:

```typescript
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type { HighlighterCore } from 'shiki/core'

let highlighterPromise: Promise<HighlighterCore> | null = null

/**
 * Shiki highlighter singleton.
 * Uses the JavaScript RegExp engine for smaller bundle size (no WASM).
 * Languages/themes are dynamically imported for optimal code splitting.
 */
export async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [
        import('shiki/themes/github-light.mjs'),
        import('shiki/themes/github-dark.mjs'),
      ],
      langs: [
        import('shiki/langs/javascript.mjs'),
        import('shiki/langs/typescript.mjs'),
        import('shiki/langs/jsx.mjs'),
        import('shiki/langs/tsx.mjs'),
        import('shiki/langs/html.mjs'),
        import('shiki/langs/css.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/markdown.mjs'),
        import('shiki/langs/bash.mjs'),
        import('shiki/langs/python.mjs'),
        import('shiki/langs/rust.mjs'),
        import('shiki/langs/go.mjs'),
      ],
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}
```

#### 2.3 Create Shiki CM6 plugin

Create `src/lib/codemirror/shiki-plugin.ts`:

```typescript
import { syntaxTree } from '@codemirror/language'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view'
import type { HighlighterCore } from 'shiki/core'

/**
 * CodeMirror 6 plugin that applies Shiki syntax highlighting to fenced code blocks.
 */
export function createShikiPlugin(
  highlighter: HighlighterCore,
  theme: string = 'github-light'
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view)
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const decorations: ReturnType<typeof Decoration.mark>[] = []

        for (const { from, to } of view.visibleRanges) {
          syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
              // FencedCode is the node type for ```code``` blocks
              if (node.name === 'FencedCode') {
                let language = 'text'
                let codeStart = node.from
                let codeEnd = node.to

                // Find CodeInfo (language) and CodeText (content) child nodes
                let child = node.node.firstChild
                while (child) {
                  if (child.name === 'CodeInfo') {
                    language = view.state.doc.sliceString(child.from, child.to)
                  }
                  if (child.name === 'CodeText') {
                    codeStart = child.from
                    codeEnd = child.to
                  }
                  child = child.nextSibling
                }

                const code = view.state.doc.sliceString(codeStart, codeEnd)
                if (!code.trim()) return

                // Check if language is loaded, fall back to plaintext
                const loadedLangs = highlighter.getLoadedLanguages()
                const langToUse = loadedLangs.includes(language) ? language : 'plaintext'

                try {
                  const { tokens } = highlighter.codeToTokens(code, {
                    lang: langToUse,
                    theme,
                  })

                  let pos = codeStart
                  for (const line of tokens) {
                    for (const token of line) {
                      const tokenEnd = pos + token.content.length
                      if (token.color) {
                        decorations.push(
                          Decoration.mark({
                            attributes: { style: `color: ${token.color}` },
                          }).range(pos, tokenEnd)
                        )
                      }
                      pos = tokenEnd
                    }
                    pos++ // newline
                  }
                } catch {
                  // Highlighting failed, skip (shows unstyled code)
                }
              }
            },
          })
        }

        return Decoration.set(decorations, true)
      }
    },
    { decorations: (v) => v.decorations }
  )
}
```

#### 2.4 Update MarkdownEditor with Shiki

Update `src/components/notes/MarkdownEditor.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState, type Extension } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { GFM } from '@lezer/markdown'
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core'
import { createShikiPlugin } from '@/lib/codemirror/shiki-plugin'
import { getHighlighter } from '@/lib/highlighter'
import type { HighlighterCore } from 'shiki/core'

interface MarkdownEditorProps {
  content: string
  onChange: (markdown: string) => void
  placeholder?: string
}

const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
    padding: '0',
  },
  '.cm-line': {
    padding: '0',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-placeholder': {
    color: 'var(--muted-foreground)',
  },
})

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
        onChangeRef.current?.(update.state.doc.toString())
      }
    }),
    EditorView.contentAttributes.of({
      'data-placeholder': placeholder,
    }),
  ]

  if (highlighter) {
    extensions.push(createShikiPlugin(highlighter, 'github-light'))
  }

  return extensions
}

export function MarkdownEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null)

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Load Shiki highlighter
  useEffect(() => {
    getHighlighter().then(setHighlighter)
  }, [])

  // Initialize editor (after highlighter loads)
  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: content,
      extensions: buildExtensions(onChangeRef, placeholder, highlighter),
    })

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [highlighter]) // Recreate when highlighter loads

  // Sync content from props (for note switching)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (content !== currentContent) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      })
    }
  }, [content])

  return <div ref={containerRef} className="flex-1" />
}
```

---

## File Structure

```
src/
├── components/
│   └── notes/
│       ├── MarkdownEditor.tsx    # Main editor component
│       └── NoteEditor.tsx        # Updated to use MarkdownEditor
├── lib/
│   ├── codemirror/
│   │   └── shiki-plugin.ts       # Shiki CM6 decoration plugin (~80 LOC)
│   └── highlighter.ts            # Shiki highlighter singleton (~40 LOC)
└── styles/
    └── global.css                # Add ProseMark CSS variables
```

## File Changes Summary

| File | Action | Phase | Description |
|------|--------|-------|-------------|
| `package.json` | Modify | 1 & 2 | Add ProseMark, CM6, and Shiki dependencies |
| `src/styles/global.css` | Modify | 1 | Add ProseMark CSS variables |
| `src/components/notes/MarkdownEditor.tsx` | Create | 1 | Editor component (~100 LOC) |
| `src/components/notes/NoteEditor.tsx` | Modify | 1 | Replace textarea with MarkdownEditor |
| `src/lib/highlighter.ts` | Create | 2 | Shiki highlighter singleton (~40 LOC) |
| `src/lib/codemirror/shiki-plugin.ts` | Create | 2 | Shiki CM6 plugin (~80 LOC) |

## What ProseMark Provides (Out of Box)

| Feature | Behavior |
|---------|----------|
| Bold (`**text**`) | Syntax hidden when cursor leaves |
| Italic (`*text*`) | Syntax hidden when cursor leaves |
| Strikethrough (`~~text~~`) | Syntax hidden when cursor leaves |
| Headings (`# `) | `#` marks hidden when cursor leaves |
| Links (`[text](url)`) | URL hidden, clickable link shown |
| Images (`![alt](url)`) | Rendered inline |
| Lists (`-`, `1.`) | Bullets become `•` widgets |
| Task lists (`- [ ]`) | Clickable checkboxes |
| Blockquotes (`>`) | Styled with vertical bar |
| Inline code | Backticks hidden, background styled |
| Code blocks | Container styled (+ Shiki highlighting) |
| Horizontal rules (`---`) | Rendered as line widget |

## What's Not Included

| Feature | Status |
|---------|--------|
| Tables | Not supported by ProseMark |
| Math/LaTeX | Not supported |
| Keyboard shortcuts (Ctrl+B) | Not built-in |

## Considerations

### Data Migration
**None needed** - content is already stored as raw markdown strings.

### Performance
- Decorations only computed for visible ranges
- Shiki highlighter cached as singleton
- ProseMark optimized for large documents

### Offline Support
No changes needed - PWA and IndexedDB storage remain unchanged.

### Encryption
No changes needed - `doc.toString()` returns raw markdown for encryption.

### Bundle Size

| Package | Size (gzipped) |
|---------|----------------|
| `@prosemark/core` | ~15KB |
| CodeMirror 6 deps | ~50KB |
| `shiki` (fine-grained) | ~100KB + languages |
| **Total addition** | **~170KB** + Shiki languages |

Shiki WASM (~500KB) is loaded async and cached by service worker.

## Future Enhancements (Out of Scope)

- [ ] Dark mode theme switching
- [ ] Table support (contribute to ProseMark or custom)
- [ ] Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
- [ ] Image paste/drop support
- [ ] Math/LaTeX rendering
- [ ] Vim keybindings

## References

- [ProseMark GitHub](https://github.com/jsimonrichard/ProseMark)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [Shiki Documentation](https://shiki.style/)
