import React from "react";
import ReactDatePicker from "react-datepicker";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-datepicker/dist/react-datepicker.css";

const DatePicker = ({
  value,
  onChange,
  placeholder = "Chọn ngày",
  minDate,
  maxDate,
  disabled = false,
  className,
  ...props
}) => {
  return (
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <ReactDatePicker
        selected={value || null}
        onChange={(date) => onChange?.(date)}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        placeholderText={placeholder}
        dateFormat="dd/MM/yyyy"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background py-2 pr-3 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
};

export { DatePicker };
