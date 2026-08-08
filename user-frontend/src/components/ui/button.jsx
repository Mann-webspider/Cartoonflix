"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Monochrome by design: the primary action is bone on ink, not a colour.
 * Every poster on this page is saturated, so a coloured button would be a
 * fourth thing competing with the artwork.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-display font-bold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-text text-contrast-ink hover:bg-white active:scale-[0.98]",
        outline:
          "border border-line-strong bg-ink/40 text-text backdrop-blur hover:bg-surface-2 active:scale-[0.98]",
        ghost: "text-dim hover:bg-surface-2 hover:text-text",
        subtle: "bg-surface-2 text-text hover:bg-surface",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[0.9rem]",
        lg: "h-[3.25rem] px-7 text-[0.95rem]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
