'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, RemoveFormatting } from 'lucide-react';
import { clsx } from 'clsx';

// Limpia HTML de Word para pegado correcto (preserva negrita, cursiva, subrayado, listas)
function cleanWordHTML(html: string): string {
    let cleaned = html;
    cleaned = cleaned.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    cleaned = cleaned.replace(/<(\/)?(xml|o:|w:|m:|v:)[^>]*>/gi, '');
    cleaned = cleaned.replace(/class="?Mso[^"]*"?/gi, '');
    cleaned = cleaned.replace(/style="[^"]*"/gi, '');
    cleaned = cleaned.replace(/lang="[^"]*"/gi, '');
    cleaned = cleaned.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/(&nbsp;|\u00A0)+/g, ' ');
    cleaned = cleaned.replace(/<(\w+)[^>]*>\s*<\/\1>/gi, '');
    return cleaned.trim();
}

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
    disabled?: boolean;
    className?: string;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = '',
    minHeight = 280,
    disabled = false,
    className,
}: RichTextEditorProps) {
    const isInitialMount = useRef(true);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: false,
                code: false,
                codeBlock: false,
                blockquote: false,
                horizontalRule: false,
            }),
            Underline,
            TextAlign.configure({
                types: ['paragraph'],
                alignments: ['left', 'center', 'right', 'justify'],
            }),
            Placeholder.configure({ placeholder }),
        ],
        content: value || '',
        editable: !disabled,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none p-4 min-h-[200px]',
                spellcheck: 'true',
            },
            handlePaste: (view, event) => {
                const html = event.clipboardData?.getData('text/html');
                const plainText = event.clipboardData?.getData('text/plain') || '';
                if (html) {
                    const cleaned = cleanWordHTML(html);
                    if (cleaned.length < html.length * 0.3 && plainText) {
                        view.dispatch(view.state.tr.insertText(plainText));
                        return true;
                    }
                    if (editor) {
                        editor.commands.insertContent(cleaned);
                        return true;
                    }
                }
                return false;
            },
        },
        onUpdate: ({ editor: ed }) => {
            onChange(ed.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) return;
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (editor.getHTML() !== value) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [disabled, editor]);

    if (!editor) return null;

    const ToolbarButton = ({
        onClick,
        active,
        disabled: btnDisabled,
        title,
        children,
    }: {
        onClick: () => void;
        active?: boolean;
        disabled?: boolean;
        title: string;
        children: React.ReactNode;
    }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={btnDisabled}
            title={title}
            className={clsx(
                'p-2 rounded hover:bg-neutral-200 transition-colors flex items-center justify-center min-w-[32px] h-8 disabled:opacity-50 disabled:cursor-not-allowed',
                active && 'bg-lime-brand-100 text-lime-brand-700'
            )}
        >
            {children}
        </button>
    );

    const Separator = () => <div className="w-px h-5 bg-neutral-300 mx-1" />;

    return (
        <div className={clsx('border border-neutral-300 rounded-lg overflow-hidden bg-white', className)}>
            <div className="flex flex-wrap gap-1 items-center p-2 bg-neutral-50 border-b border-neutral-200">
                <div className="flex gap-0.5">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Undo"
                    >
                        <Undo2 className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Redo"
                    >
                        <Redo2 className="w-4 h-4" />
                    </ToolbarButton>
                </div>
                <Separator />
                <div className="flex gap-0.5">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        title="Underline"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </ToolbarButton>
                </div>
                <Separator />
                <div className="flex gap-0.5">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        active={editor.isActive({ textAlign: 'left' })}
                        title="Align left"
                    >
                        <AlignLeft className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        active={editor.isActive({ textAlign: 'center' })}
                        title="Align center"
                    >
                        <AlignCenter className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        active={editor.isActive({ textAlign: 'right' })}
                        title="Align right"
                    >
                        <AlignRight className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                        active={editor.isActive({ textAlign: 'justify' })}
                        title="Justify"
                    >
                        <AlignJustify className="w-4 h-4" />
                    </ToolbarButton>
                </div>
                <Separator />
                <div className="flex gap-0.5">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        title="Bullet list"
                    >
                        <List className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        title="Numbered list"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </ToolbarButton>
                </div>
                <Separator />
                <ToolbarButton
                    onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                    title="Clear format"
                >
                    <RemoveFormatting className="w-4 h-4" />
                </ToolbarButton>
            </div>
            <div
                className="overflow-y-auto rich-text-editor-content"
                style={{ minHeight: `${minHeight}px` }}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
