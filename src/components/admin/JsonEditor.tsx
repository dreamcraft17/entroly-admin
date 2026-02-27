"use client";

import { useState, useEffect } from "react";

interface JsonEditorProps {
  value: object;
  onChange: (value: object) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

export default function JsonEditor({
  value,
  onChange,
  error,
  label,
  required,
}: JsonEditorProps) {
  const [raw, setRaw] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setRaw(JSON.stringify(value, null, 2));
  }, [value]);

  function handleChange(text: string) {
    setRaw(text);
    try {
      const parsed = JSON.parse(text);
      setParseError(null);
      onChange(parsed);
    } catch {
      setParseError("Invalid JSON");
    }
  }

  const hasError = !!parseError || !!error;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        rows={10}
        className={`font-mono text-sm rounded-md border px-3 py-2 bg-gray-900 text-gray-100 outline-none resize-y ${
          hasError
            ? "border-red-500 focus:ring-1 focus:ring-red-500"
            : "border-gray-700 focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        }`}
        spellCheck={false}
      />
      {(parseError || error) && (
        <p className="text-xs text-red-400">{parseError ?? error}</p>
      )}
    </div>
  );
}
