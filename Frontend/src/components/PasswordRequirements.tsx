'use client';

import { Check, X } from 'lucide-react';

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

interface Requirement {
  label: string;
  regex: RegExp;
  minLength?: number;
}

const requirements: Requirement[] = [
  { label: 'At least 12 characters', regex: /.{12,}/, minLength: 12 },
  { label: 'One uppercase letter', regex: /[A-Z]/ },
  { label: 'One lowercase letter', regex: /[a-z]/ },
  { label: 'One number', regex: /\d/ },
  { label: 'One special character', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/ },
];

export default function PasswordRequirements({ password, className = '' }: PasswordRequirementsProps) {
  const checkRequirement = (req: Requirement) => {
    if (req.minLength) {
      return password.length >= req.minLength;
    }
    return req.regex.test(password);
  };

  return (
    <div className={`mt-2 ${className}`}>
      <p className="text-sm text-gray-600 mb-2">Password requirements:</p>
      <div className="space-y-1">
        {requirements.map((req, index) => {
          const isValid = checkRequirement(req);
          return (
            <div key={index} className="flex items-center text-xs">
              {isValid ? (
                <Check className="h-3 w-3 text-green-500 mr-2" />
              ) : (
                <X className="h-3 w-3 text-red-400 mr-2" />
              )}
              <span className={isValid ? 'text-green-600' : 'text-gray-500'}>
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}