"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ChipsInputProps
  // The form's FormControl passes id, aria-invalid and aria-describedby down;
  // they belong on the real input, not swallowed by the wrapper.
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A list of short free-text values — genres, tags, directors.
 *
 * Enter or comma commits; Backspace on an empty field removes the last chip,
 * which is what every tag input people have used already does. Duplicates are
 * dropped silently rather than rejected with an error, since a duplicate genre
 * is a slip, not a decision worth interrupting for.
 */
export function ChipsInput({
  value,
  onChange,
  placeholder,
  className,
  ...inputProps
}: ChipsInputProps) {
  const [draft, setDraft] = React.useState("");

  const commit = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    if (!value.some((existing) => existing.toLowerCase() === next.toLowerCase())) {
      onChange([...value, next]);
    }
    setDraft("");
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      // Enter would otherwise submit the surrounding form.
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
    >
      {value.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
        >
          {item}
          <button
            type="button"
            onClick={() => onChange(value.filter((existing) => existing !== item))}
            className="opacity-60 hover:opacity-100"
            aria-label={`Remove ${item}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <input
        {...inputProps}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        // Committing on blur too, so a typed-but-unconfirmed value is not lost
        // when the operator tabs straight to Save.
        onBlur={() => commit(draft)}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
