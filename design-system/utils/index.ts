/**
 * EchoinWhspr Design System - Utility Functions
 *
 * Common utility functions for the design system components.
 */

import { colors, spacing, typography } from '../tokens';

// Color utilities
export const colorUtils = {
  // Get contrast color for text on colored backgrounds
  getContrastColor: (backgroundColor: string): string => {
    // Simple contrast calculation - in a real implementation,
    // you'd use a proper contrast ratio calculation
    const lightColors = ['#ffffff', '#fafafa', '#f5f5f5'];
    return lightColors.includes(backgroundColor) ? colors.text.primary : colors.text.inverse;
  },

  // Get semantic color based on state
  getSemanticColor: (state: 'success' | 'error' | 'warning' | 'info'): string => {
    switch (state) {
      case 'success':
        return colors.success[500];
      case 'error':
        return colors.error[500];
      case 'warning':
        return colors.warning[500];
      case 'info':
        return colors.primary[500];
      default:
        return colors.neutral[500];
    }
  },
};

// Spacing utilities
export const spacingUtils = {
  // Get responsive spacing based on screen size
  getResponsiveSpacing: (baseSize: keyof typeof spacing, screenSize?: 'sm' | 'md' | 'lg') => {
    const multipliers = {
      sm: 0.75,
      md: 1,
      lg: 1.25,
    };

    const multiplier = multipliers[screenSize || 'md'];
    const baseValue = parseFloat(spacing[baseSize]);
    return `${baseValue * multiplier}rem`;
  },

  // Get spacing for touch targets (minimum 44px)
  getTouchTargetSize: (size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizes = {
      sm: spacing[8],  // 32px
      md: spacing[11], // 44px
      lg: spacing[12], // 48px
    };
    return sizes[size];
  },
};

// Typography utilities
export const typographyUtils = {
  // Get font size with line height
  getTextStyle: (size: keyof typeof typography.fontSize) => ({
    fontSize: typography.fontSize[size],
    lineHeight: typography.lineHeight.normal,
  }),

  // Get heading styles
  getHeadingStyle: (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    const styles = {
      1: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: typography.fontWeight.bold,
        lineHeight: typography.lineHeight.tight,
        letterSpacing: typography.letterSpacing.tight,
      },
      2: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.semibold,
        lineHeight: typography.lineHeight.tight,
        letterSpacing: typography.letterSpacing.tight,
      },
      3: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.semibold,
        lineHeight: typography.lineHeight.snug,
        letterSpacing: typography.letterSpacing.normal,
      },
      4: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.semibold,
        lineHeight: typography.lineHeight.snug,
        letterSpacing: typography.letterSpacing.normal,
      },
      5: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.medium,
        lineHeight: typography.lineHeight.normal,
        letterSpacing: typography.letterSpacing.normal,
      },
      6: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.medium,
        lineHeight: typography.lineHeight.normal,
        letterSpacing: typography.letterSpacing.normal,
      },
    };
    return styles[level];
  },
};

// Animation utilities
export const animationUtils = {
  // Common easing functions
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
  },

  // Common durations
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Get transition style
  getTransition: (properties: string[], duration: number = 300, easing: string = 'easeInOut') => ({
    transitionProperty: properties.join(', '),
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: animationUtils.easing[easing as keyof typeof animationUtils.easing] || easing,
  }),
};

// Validation utilities
export const validationUtils = {
  // Check if color meets contrast requirements
  meetsContrastRatio: (_foreground: string, _background: string): boolean => {
    // Simplified contrast check - in production, use a proper contrast library
    // This is a placeholder implementation
    return true;
  },

  // Validate spacing values
  isValidSpacing: (value: string): boolean => {
    const validSpacing = Object.values(spacing);
    return (validSpacing as readonly string[]).includes(value);
  },
};

// Platform detection utilities
export const platformUtils = {
  // Detect if running on web
  isWeb: typeof window !== 'undefined' && typeof window.document !== 'undefined',

  // Detect if running on React Native
  isReactNative: typeof navigator !== 'undefined' && navigator.product === 'ReactNative',

  // Get platform-specific value
  getPlatformValue: <T>(webValue: T, nativeValue: T): T => {
    return platformUtils.isWeb ? webValue : nativeValue;
  },
};

export { cn } from './cn';

export {
  colorUtils as colors,
  spacingUtils as spacing,
  typographyUtils as typography,
  animationUtils as animation,
  validationUtils as validation,
  platformUtils as platform,
};