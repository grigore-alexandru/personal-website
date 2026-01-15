import { TextareaHTMLAttributes, forwardRef, useEffect, useRef } from 'react';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
  autoResize?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, helperText, showCharCount, autoResize = true, className = '', id, value, maxLength, ...props }, ref) => {
    const textareaId = id || label.toLowerCase().replace(/\s+/g, '-');
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (element: HTMLTextAreaElement | null) => {
      internalRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    useEffect(() => {
      if (autoResize && internalRef.current) {
        const textarea = internalRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    }, [value, autoResize]);

    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        <label htmlFor={textareaId} className="block text-sm font-medium text-black mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          ref={setRefs}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-neutral-300 focus:ring-black focus:border-transparent'
          } disabled:bg-neutral-100 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex-1">
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            {helperText && !error && (
              <p className="text-sm text-neutral-500">{helperText}</p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p className={`text-sm ml-4 ${currentLength > maxLength * 0.9 ? 'text-orange-600' : 'text-neutral-500'}`}>
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';
