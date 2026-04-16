import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DateInputProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  onBlur?: () => void;
  disabled?: boolean;
  max?: string;
  min?: string;
  className?: string;
  placeholder?: string;
}

const toIsoDateString = (date?: Date) => {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const toDisplayDate = (date?: Date) => {
  if (!date || Number.isNaN(date.getTime())) return "";
  return format(date, "dd/MM/yyyy");
};

const parseDisplayDate = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return undefined;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
};

const formatPartialDate = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const isWithinBounds = (date: Date, min?: string, max?: string) => {
  const iso = toIsoDateString(date);
  if (!iso) return false;
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
};

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, onBlur, disabled, max, min, className, placeholder = "JJ/MM/AAAA" }, ref) => {
    const [localValue, setLocalValue] = React.useState(() => toDisplayDate(value));

    React.useEffect(() => {
      setLocalValue(toDisplayDate(value));
    }, [value]);

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={localValue}
        disabled={disabled}
        className={cn("w-full", className)}
        onChange={(event) => {
          const formatted = formatPartialDate(event.target.value);
          setLocalValue(formatted);

          if (!formatted) {
            onChange(undefined);
            return;
          }

          const parsed = parseDisplayDate(formatted);
          if (parsed && isWithinBounds(parsed, min, max)) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          const parsed = parseDisplayDate(localValue);

          if (!localValue) {
            onChange(undefined);
          } else if (parsed && isWithinBounds(parsed, min, max)) {
            const normalized = toDisplayDate(parsed);
            setLocalValue(normalized);
            onChange(parsed);
          } else {
            onChange(undefined);
          }

          onBlur?.();
        }}
      />
    );
  },
);

DateInput.displayName = "DateInput";

export { DateInput };
