import React, { useRef } from 'react';

export interface CodeBoxesProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}

export const CodeBoxes: React.FC<CodeBoxesProps> = ({
  value = '',
  onChange,
  disabled = false,
  className = '',
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.padEnd(6, '').slice(0, 6).split('');

  const sanitizeChar = (c: string) => {
    const upper = c.toUpperCase();
    // Exclude confusing characters 0, O, 1, I
    if (['0', 'O', '1', 'I'].includes(upper)) return '';
    return /^[A-Z2-9]$/.test(upper) ? upper : '';
  };

  const handleInputChange = (index: number, val: string) => {
    if (!val) {
      const newChars = [...chars];
      newChars[index] = '';
      onChange(newChars.join('').trimEnd());
      return;
    }

    const clean = sanitizeChar(val[val.length - 1]);
    if (!clean) return;

    const newChars = [...chars];
    newChars[index] = clean;
    const combined = newChars.join('');
    onChange(combined);

    if (index < 5 && clean) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    let sanitized = '';
    for (const char of pasted) {
      const clean = sanitizeChar(char);
      if (clean && sanitized.length < 6) {
        sanitized += clean;
      }
    }
    onChange(sanitized);
    const nextIndex = Math.min(5, sanitized.length);
    inputsRef.current[nextIndex]?.focus();
  };

  return (
    <div className={`flex justify-center gap-2 ${className}`}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text"
          maxLength={1}
          value={chars[idx] || ''}
          disabled={disabled}
          onChange={(e) => handleInputChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className="w-11 h-14 text-center font-mono text-2xl font-black uppercase bg-chit text-ink border-2 border-ink shadow-hard-sm rounded-btn focus:outline-none focus:ring-2 focus:ring-highlighter disabled:opacity-50"
        />
      ))}
    </div>
  );
};
