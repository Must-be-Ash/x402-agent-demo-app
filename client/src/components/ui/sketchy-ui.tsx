import React from 'react';
import { cn } from '@/lib/utils';

interface SketchyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent';
}

export const SketchyButton = React.forwardRef<HTMLButtonElement, SketchyButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "sketchy-button",
          variant === 'accent' && "bg-accent text-accent-foreground border-accent-foreground",
          variant === 'secondary' && "bg-secondary text-secondary-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
SketchyButton.displayName = "SketchyButton";

export const SketchyCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("sketchy-box p-6 bg-white", className)}
        {...props}
      />
    );
  }
);
SketchyCard.displayName = "SketchyCard";

export const SketchyInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn("sketchy-input w-full font-body text-lg", className)}
        {...props}
      />
    );
  }
);
SketchyInput.displayName = "SketchyInput";

export const SketchyTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full bg-transparent font-body text-lg outline-none resize-none leading-8",
          "bg-[linear-gradient(transparent_31px,#ccc_31px)] bg-local bg-[length:100%_32px]",
          className
        )}
        {...props}
      />
    );
  }
);
SketchyTextarea.displayName = "SketchyTextarea";
