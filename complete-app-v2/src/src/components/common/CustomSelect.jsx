/**
 * FILE: frontend/src/components/common/CustomSelect.jsx
 * PURPOSE: Drop-in replacement for native <select> — the frameless,
 * transparent Electron window (main.js: frame:false, transparent:true)
 * doesn't compose a native <select> popup's background correctly,
 * making dropdown options invisible unless stealth/content-protection
 * happens to fix compositing as a side effect. This renders the options
 * list as normal DOM inside our own window, so it always composites
 * correctly regardless of stealth state.
 *
 * API mirrors what the call sites need from a native <select>: value,
 * onChange(value), disabled, and an options array of {value, label}.
 */

import { useEffect, useRef, useState } from 'react';
import './CustomSelect.css';

export default function CustomSelect({
  value,
  onChange,
  options, // [{ value, label, disabled? }]
  placeholder = 'Select…',
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`custom-select ${disabled ? 'custom-select--disabled' : ''} ${className}`}
    >
      <button
        type="button"
        className="custom-select__trigger"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
      >
        <span className="custom-select__value">
          {selected ? selected.label : placeholder}
        </span>
        <span className={`custom-select__arrow ${isOpen ? 'custom-select__arrow--open' : ''}`}>
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="custom-select__menu">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-select__option ${
                opt.value === value ? 'custom-select__option--selected' : ''
              } ${opt.disabled ? 'custom-select__option--disabled' : ''}`}
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}