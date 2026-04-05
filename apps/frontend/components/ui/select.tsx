"use client";

/**
 * Lightweight dark-themed Select built on @base-ui/react/select.
 * No hugeicons dependency — uses inline SVG chevron.
 */
import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  children,
  ...props
}: Omit<SelectPrimitive.Trigger.Props, "className"> & { className?: string }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex min-w-[8rem] items-center justify-between gap-2 rounded-xl border border-white/15 bg-[#0a1228] px-3 py-2 font-mono text-xs text-cream outline-none transition hover:bg-[#111c3a] focus-visible:border-neon/50 focus-visible:ring-1 focus-visible:ring-neon/30 disabled:cursor-not-allowed disabled:opacity-50 data-[popup-open]:border-neon/40",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 opacity-50"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  ...props
}: Omit<SelectPrimitive.Popup.Props, "className"> & { className?: string }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={6} className="z-[9999]">
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "relative z-[9999] max-h-[280px] min-w-[8rem] overflow-y-auto rounded-xl border border-white/15 bg-[#0a1228] p-1 text-cream shadow-[0_16px_48px_rgba(0,0,0,0.6)] outline-none",
            "origin-(--transform-origin) transition-[transform,opacity]",
            "data-open:opacity-100 data-open:scale-100",
            "data-closed:opacity-0 data-closed:scale-95",
            className
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: Omit<SelectPrimitive.Item.Props, "className"> & { className?: string }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-lg px-3 py-2 font-mono text-xs text-cream outline-none transition",
        "hover:bg-neon/10 hover:text-neon",
        "focus:bg-neon/10 focus:text-neon",
        "data-highlighted:bg-neon/10 data-highlighted:text-neon",
        "data-selected:text-neon",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 5L4 7L8 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectLabel({
  className,
  ...props
}: Omit<SelectPrimitive.GroupLabel.Props, "className"> & { className?: string }) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        "px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cream/40",
        className
      )}
      {...props}
    />
  );
}

function SelectSeparator({
  className,
  ...props
}: Omit<SelectPrimitive.Separator.Props, "className"> & { className?: string }) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("my-1 h-px bg-white/10", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
