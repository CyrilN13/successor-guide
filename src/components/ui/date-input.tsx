import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DateInputProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  onBlur?: () => void;
  disabled?: boolean;
  max?: string; // yyyy-MM-dd
  min?: string; // yyyy-MM-dd
  className?: string;
  placeholder?: string;
}

/**
 * Simple native date input — ergonomic on all platforms,
 * fully localized by the browser, no English labels.
 */
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, onBlur, disabled, max, min, className, placeholder }, ref) => {
    const stringValue = value
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
      : "";

    return (
      <Input
        ref={ref}
        type="date"
        value={stringValue}
        max={max}
        min={min}
        disabled={disabled}
        placeholder={placeholder}
        className={cn("w-full", className)}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            const [y, m, d] = val.split("-").map(Number);
            onChange(new Date(y, m - 1, d));
          } else {
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
