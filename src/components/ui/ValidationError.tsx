import { AlertCircle } from 'lucide-react';

interface ValidationErrorProps {
  message: string;
}

export function ValidationError({ message }: ValidationErrorProps) {
  return (
    <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
      <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-800">{message}</p>
    </div>
  );
}
