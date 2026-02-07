import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Criteria {
  label: string;
  test: (password: string) => boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
}) => {
  const criteria: Criteria[] = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'Contains number', test: (p) => /\d/.test(p) },
    { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const metCriteria = criteria.filter((c) => c.test(password)).length;
  const strength = metCriteria === 0 ? 0 : (metCriteria / criteria.length) * 100;

  const getStrengthColor = () => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength < 40) return 'Weak';
    if (strength < 80) return 'Medium';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${strength}%` }}
          ></div>
        </div>
        <span className="text-sm font-medium text-gray-700">{getStrengthLabel()}</span>
      </div>
      <ul className="space-y-1">
        {criteria.map((criterion, index) => {
          const isMet = criterion.test(password);
          return (
            <li
              key={index}
              className={`flex items-center gap-2 text-xs ${
                isMet ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              <svg
                className={`h-4 w-4 ${isMet ? 'text-green-600' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMet ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                )}
              </svg>
              {criterion.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
