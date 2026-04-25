import React, { useEffect, useRef } from 'react';
import Vditor from 'vditor';
import { API_BASE_URL } from '../services/api';

export interface VditorEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  mode?: 'ir' | 'sv' | 'wysiwyg';
  height?: number;
}

const VditorEditor: React.FC<VditorEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Write your post content in Markdown...',
  disabled = false,
  mode = 'ir',
  height = 460,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const vditorRef = useRef<Vditor | null>(null);
  const readyRef = useRef(false);
  const disabledRef = useRef(disabled);
  const lastValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  const safeDestroy = (instance: Vditor) => {
    try {
      const internal = instance as Vditor & { vditor?: { element?: unknown } };
      if (internal.vditor?.element) {
        instance.destroy();
      }
    } catch {
      // Guard against Vditor lifecycle race conditions in React StrictMode.
    }
  };

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    if (!containerRef.current || vditorRef.current) {
      return;
    }

    const toolbar: Array<string | { name: string; tip?: string }> = [
      'emoji',
      'headings',
      'bold',
      'italic',
      'strike',
      'link',
      '|',
      'list',
      'ordered-list',
      'check',
      '|',
      'quote',
      'line',
      'code',
      'inline-code',
      '|',
      'upload',
      'table',
      '|',
      'undo',
      'redo',
      'edit-mode',
      'preview',
    ];

    const instance = new Vditor(containerRef.current, {
      mode,
      height,
      placeholder,
      toolbar,
      cache: {
        enable: false,
      },
      upload: {
        url: `${API_BASE_URL}/api/uploads/images`,
        fieldName: 'file[]',
        accept: 'image/*',
        max: 10 * 1024 * 1024,
      },
      counter: {
        enable: true,
        max: 10000,
      },
      input: (markdown) => {
        lastValueRef.current = markdown;
        onChangeRef.current?.(markdown);
      },
      after: () => {
        readyRef.current = true;

        if (lastValueRef.current !== instance.getValue()) {
          instance.setValue(lastValueRef.current);
        }

        if (disabledRef.current) {
          instance.disabled();
        }
      },
    });

    vditorRef.current = instance;

    return () => {
      readyRef.current = false;
      safeDestroy(instance);
      vditorRef.current = null;
    };
  }, [height, mode, placeholder]);

  useEffect(() => {
    const instance = vditorRef.current;
    if (!instance || !readyRef.current) {
      return;
    }

    if (value !== lastValueRef.current && value !== instance.getValue()) {
      instance.setValue(value);
      lastValueRef.current = value;
    }
  }, [value]);

  return (
    <div className="vditor-editor-shell">
      <div ref={containerRef} />
    </div>
  );
};

export default VditorEditor;
