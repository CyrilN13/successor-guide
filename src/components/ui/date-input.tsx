import * as React from "react";
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

function dateToString(d?: Date): string {
  if (!d || isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, onBlur, disabled, max, min, className }, ref) => {
    const [local, setLocal] = React.useState(() => dateToString(value));

    // Sync from parent when value changes externally
    React.useEffect(() => {
      const parentStr = dateToString(value);
      setLocal((prev) => (prev !== parentStr ? parentStr : prev));
    }, [value]);

    return (
      <Input
        ref={ref}
        type="date"
        value={local}
        max={max}
        min={min}
        disabled={disabled}
        className={cn("w-full", className)}
        onChange={(e) => {
          const val = e.target.value;
          setLocal(val);
          if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [y, m, d] = val.split("-").map(Number);
            const date = new Date(y, m - 1, d);
            if (!isNaN(date.getTime())) {
              onChange(date);
            }
          } else if (!val) {
            onChange(undefined);
          }
        }}
        onBlur={onBlur}
      />
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
