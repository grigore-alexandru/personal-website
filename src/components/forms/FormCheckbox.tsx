import { InputHTMLAttributes, forwardRef } from 'react';
import { Check } from 'lucide-react';

interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  helperText?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, helperText, className = '', id, checked, onChange, ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.target.checked as any);
      }
    };

    return (
      <div className="w-full">
        <label htmlFor={checkboxId} className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              checked={checked}
              className="sr-only peer"
              onChange={handleChange}
              {...props}
            />
            <div className="w-5 h-5 border-2 border-neutral-300 rounded bg-white peer-checked:bg-black peer-checked:border-black peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-2 transition-all peer-disabled:bg-neutral-100 peer-disabled:cursor-not-allowed flex items-center justify-center">
              {checked && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-black group-hover:text-neutral-700 transition-colors">
              {label}
            </span>
            {helperText && (
              <p className="mt-1 text-sm text-neutral-500">{helperText}</p>
            )}
          </div>
        </label>
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';
