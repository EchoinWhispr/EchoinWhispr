/**
 * EchoinWhspr Design System - Input Component
 *
 * Form input component with proper accessibility, error states, and React Hook Form integration.
 * Uses custom colors and fonts from the design system.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const inputVariants = cva(
  'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-error-500 focus-visible:ring-error-500',
        success: 'border-success-500 focus-visible:ring-success-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  name?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    type,
    name,
    label,
    error,
    helperText,
    required,
    startAdornment,
    endAdornment,
    id,
    ...props
  }, ref) => {
    let formContext;
    try {
      formContext = useFormContext();
    } catch {
      formContext = null;
    }
    const fieldError = formContext?.formState?.errors[name!]?.message as string | undefined;
    const hasError = error || fieldError;
    const inputId = id || name;

    const inputElement = (
      <div className="relative">
        {startAdornment && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {startAdornment}
          </div>
        )}
        <input
          type={type}
          id={inputId}
          name={name}
          ref={ref}
          className={cn(
            inputVariants({ variant: hasError ? 'error' : variant }),
            startAdornment && 'pl-10',
            endAdornment && 'pr-10',
            className
          )}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {endAdornment && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {endAdornment}
          </div>
        )}
      </div>
    );

    if (!label) {
      return (
        <>
          {inputElement}
          {hasError && (
            <p
              id={`${inputId}-error`}
              className="mt-1 text-sm text-error-600"
              role="alert"
            >
              {hasError}
            </p>
          )}
          {helperText && !hasError && (
            <p
              id={`${inputId}-helper`}
              className="mt-1 text-sm text-muted-foreground"
            >
              {helperText}
            </p>
          )}
        </>
      );
    }

    return (
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
        {inputElement}
        {hasError && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-error-600"
            role="alert"
          >
            {hasError}
          </p>
        )}
        {helperText && !hasError && (
          <p
            id={`${inputId}-helper`}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };