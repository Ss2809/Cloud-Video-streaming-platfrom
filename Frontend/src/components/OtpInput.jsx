import React, { useRef, useEffect } from 'react';

export default function OtpInput({ length = 6, value = '', onChange, disabled = false, autoFocus = true }) {
  const inputRefs = useRef([]);

  // Ensure refs array has the right length
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [length, autoFocus]);

  const otpDigits = value.padEnd(length, ' ').slice(0, length).split('');

  const handleChange = (e, index) => {
    const rawVal = e.target.value;
    // Extract only digits from the typed input (handle cases where input has multiple characters)
    const digitsOnly = rawVal.replace(/\D/g, '');
    
    if (!digitsOnly) {
      // User cleared the box
      const newOtp = otpDigits.map((d, i) => (i === index ? '' : d.trim())).join('');
      onChange(newOtp);
      return;
    }

    // If pasted or typed multiple digits
    if (digitsOnly.length > 1) {
      const chars = digitsOnly.slice(0, length).split('');
      const newDigits = [...otpDigits.map(d => d.trim())];
      chars.forEach((char, offset) => {
        if (index + offset < length) {
          newDigits[index + offset] = char;
        }
      });
      const finalOtp = newDigits.join('');
      onChange(finalOtp);
      const nextIndex = Math.min(index + digitsOnly.length, length - 1);
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
      }
      return;
    }

    // Single digit input
    const singleDigit = digitsOnly[digitsOnly.length - 1];
    const newDigits = [...otpDigits.map(d => d.trim())];
    newDigits[index] = singleDigit;
    const finalOtp = newDigits.join('');
    onChange(finalOtp);

    // Auto-focus next input
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] || otpDigits[index] === ' ') {
        // Current box is empty, jump back to previous box
        if (index > 0 && inputRefs.current[index - 1]) {
          inputRefs.current[index - 1].focus();
          const newDigits = [...otpDigits.map(d => d.trim())];
          newDigits[index - 1] = '';
          onChange(newDigits.join(''));
        }
      } else {
        // Clear current box
        const newDigits = [...otpDigits.map(d => d.trim())];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasteData) return;
    onChange(pasteData);
    const focusTarget = Math.min(pasteData.length, length - 1);
    if (inputRefs.current[focusTarget]) {
      inputRefs.current[focusTarget].focus();
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 w-full" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => {
        const digit = otpDigits[index]?.trim() || '';
        const isFilled = Boolean(digit);

        return (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            aria-label={`Digit ${index + 1} of verification code`}
            className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-bold rounded-xl transition-all duration-200 outline-none select-none ${
              isFilled
                ? 'bg-zinc-900 border-purple-500 text-purple-300 shadow-md shadow-purple-950/40 ring-1 ring-purple-500/50'
                : 'bg-zinc-900/90 border-zinc-700/80 text-white hover:border-zinc-600'
            } focus:bg-zinc-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 border disabled:opacity-50`}
          />
        );
      })}
    </div>
  );
}
