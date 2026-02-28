'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Home,
  LogOut,
} from 'lucide-react';

interface AuthErrorBoundaryProps {
  children: ReactNode;
  /**
   * Optional fallback component to render instead of the default error UI
   */
  fallback?: ReactNode;
  /**
   * Optional callback when an error occurs
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Whether to show the "Go Home" button in the error UI
   */
  showHomeButton?: boolean;
  /**
   * Whether to show the "Sign Out" button in the error UI
   */
  showSignOutButton?: boolean;
  /**
   * Custom error message to display
   */
  customErrorMessage?: string;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  showTechnicalDetails: boolean;
  errorId: string | null;
}

/**
 * Enhanced error boundary component specifically designed for authentication flows.
 * Provides comprehensive error handling, user-friendly error UI, retry functionality,
 * and detailed error reporting for authentication-related components.
 *
 * Features:
 * - Graceful error handling for authentication components
 * - User-friendly error messages with recovery options
 * - Comprehensive error logging and categorization
 * - Network error detection and specific messaging
 * - Collapsible technical details for advanced users
 * - Multiple recovery options (retry, go home, sign out)
 * - Error tracking with unique error IDs
 */
export class AuthErrorBoundary extends Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  private retryTimeouts: Set<number> = new Set();
  private errorReportQueue: Array<{
    error: Error;
    errorInfo: ErrorInfo;
    timestamp: number;
  }> = [];

  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      showTechnicalDetails: false,
      errorId: null,
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<AuthErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `auth-err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Store error info for technical details
    this.setState({
      errorInfo,
    });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // Add to error reporting queue
    this.errorReportQueue.push({
      error,
      errorInfo,
      timestamp: Date.now(),
    });

    // Comprehensive error logging and categorization
    this.logError(error, errorInfo);

    // Process error reporting queue (limit to last 10 errors)
    if (this.errorReportQueue.length > 10) {
      this.errorReportQueue = this.errorReportQueue.slice(-10);
    }
  }

  componentWillUnmount() {
    // Clear any pending timeouts
    this.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.retryTimeouts.clear();
  }

  /**
   * Comprehensive error logging with categorization and context
   */
  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorContext = {
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount,
    };

    if (process.env.NODE_ENV === 'development') {
      console.group('🔐 Authentication Error Boundary');
      console.error('Error ID:', this.state.errorId);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', errorContext);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Categorize error for better handling
    const errorCategory = this.categorizeError(error);
    const isRecoverable = this.isRecoverableError(error);

    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Error Analysis');
      console.log('Category:', errorCategory);
      console.log('Recoverable:', isRecoverable);
      console.log('Retry Count:', this.state.retryCount);
      console.groupEnd();
    }

    // Log to external service in production (placeholder for future integration)
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo, errorContext, errorCategory);
    }
  };

  /**
   * Categorize error for better user messaging and handling
   */
  private categorizeError(error: Error): string {
    const errorMessage = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';

    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')
    ) {
      return 'NETWORK_ERROR';
    }

    if (
      errorMessage.includes('auth') ||
      errorMessage.includes('token') ||
      errorMessage.includes('session')
    ) {
      return 'AUTHENTICATION_ERROR';
    }

    if (
      errorMessage.includes('config') ||
      errorMessage.includes('setup') ||
      errorMessage.includes('initialization')
    ) {
      return 'CONFIGURATION_ERROR';
    }

    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests')
    ) {
      return 'RATE_LIMIT_ERROR';
    }

    if (stack.includes('clerk') || errorMessage.includes('clerk')) {
      return 'CLERK_SDK_ERROR';
    }

    if (stack.includes('convex') || errorMessage.includes('convex')) {
      return 'CONVEX_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Determine if error is recoverable through retry
   */
  private isRecoverableError(error: Error): boolean {
    const category = this.categorizeError(error);

    // Network errors and rate limits are usually recoverable
    const recoverableCategories = [
      'NETWORK_ERROR',
      'RATE_LIMIT_ERROR',
      'CLERK_SDK_ERROR',
    ];

    return recoverableCategories.includes(category);
  }

  /**
   * Report error to external service (placeholder for future integration)
   */
  private reportErrorToService = (
    error: Error,
    errorInfo: ErrorInfo,
    context: Record<string, unknown>,
    category: string
  ) => {
    // Prepare error report for future integration with error logging service
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      category,
      context,
      timestamp: new Date().toISOString(),
    };

    // TODO: Integrate with error logging service (e.g., Sentry, LogRocket)
    // Example: Sentry.captureException(error, { extra: errorReport })
  };

  /**
   * Handles retry functionality with exponential backoff and smart retry logic
   */
  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      this.showMaxRetriesToast();
      return;
    }

    const error = this.state.error;
    if (!error || !this.isRecoverableError(error)) {
      this.showNonRecoverableErrorToast();
      return;
    }

    // Implement exponential backoff with jitter
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🔄 Retrying authentication (attempt ${retryCount + 1}/${maxRetries}) in ${Math.round(delay)}ms...`
      );
    }

    const timeoutId = window.setTimeout(() => {
      this.retryTimeouts.delete(timeoutId);
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
        showTechnicalDetails: false,
      }));
    }, delay);

    this.retryTimeouts.add(timeoutId);
  };

  /**
   * Show toast when max retries reached
   */
  private showMaxRetriesToast = () => {
    // Import toast dynamically to avoid circular dependencies
    import('@/hooks/use-toast').then(({ toast }) => {
      toast({
        title: 'Maximum Retries Reached',
        description:
          'Unable to recover from this error. Please try refreshing the page or contact support.',
        variant: 'destructive',
      });
    });
  };

  /**
   * Show toast for non-recoverable errors
   */
  private showNonRecoverableErrorToast = () => {
    // Import toast dynamically to avoid circular dependencies
    import('@/hooks/use-toast').then(({ toast }) => {
      toast({
        title: 'Non-Recoverable Error',
        description:
          'This error cannot be automatically resolved. Please refresh the page or contact support.',
        variant: 'destructive',
      });
    });
  };

  /**
   * Handle going back to home page
   */
  private handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * Handle sign out action
   */
  private handleSignOut = async () => {
    try {
      const clerk =
        (typeof window !== 'undefined' &&
          (window as typeof window & {
            Clerk?: { signOut: (opts?: { redirectUrl?: string }) => Promise<void> };
          }).Clerk) ||
        null;

      if (clerk) {
        await clerk.signOut({ redirectUrl: '/sign-in?reason=error' });
        return;
      }

      window.location.href = '/sign-in?reason=error';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/sign-in?reason=error';
    }
  };

  /**
   * Toggles technical details visibility
   */
  private toggleTechnicalDetails = () => {
    this.setState(prevState => ({
      showTechnicalDetails: !prevState.showTechnicalDetails,
    }));
  };

  /**
   * Get user-friendly error message based on error category
   */
  private getErrorMessage = (): { title: string; description: string } => {
    if (this.props.customErrorMessage) {
      return {
        title: 'Authentication Error',
        description: this.props.customErrorMessage,
      };
    }

    const error = this.state.error;
    if (!error) {
      return {
        title: 'Authentication Error',
        description: 'An unexpected error occurred during authentication.',
      };
    }

    const category = this.categorizeError(error);

    switch (category) {
      case 'NETWORK_ERROR':
        return {
          title: 'Connection Error',
          description:
            'Unable to connect to the authentication service. Please check your internet connection and try again.',
        };
      case 'AUTHENTICATION_ERROR':
        return {
          title: 'Authentication Error',
          description:
            'There was a problem with your authentication session. Please try signing in again.',
        };
      case 'CONFIGURATION_ERROR':
        return {
          title: 'Configuration Error',
          description:
            'There seems to be a configuration issue with the authentication system.',
        };
      case 'RATE_LIMIT_ERROR':
        return {
          title: 'Too Many Requests',
          description:
            "You've made too many requests. Please wait a moment before trying again.",
        };
      case 'CLERK_SDK_ERROR':
        return {
          title: 'Authentication Service Error',
          description:
            'The authentication service encountered an unexpected error. Please try again.',
        };
      case 'CONVEX_ERROR':
        return {
          title: 'Data Service Error',
          description:
            'There was an issue connecting to our data service. Please try again.',
        };
      default:
        return {
          title: 'Authentication Error',
          description:
            'An unexpected error occurred. Please try refreshing the page or contact support if the issue persists.',
        };
    }
  };

  render() {
    const { hasError, error, retryCount, showTechnicalDetails, errorId } =
      this.state;
    const { showHomeButton = true, showSignOutButton = true } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { title, description } = this.getErrorMessage();
      const category = this.categorizeError(error);
      const isRecoverable = this.isRecoverableError(error);
      const maxRetries = 3;

      return (
        <main
          className="flex min-h-[100dvh] flex-col items-center justify-center p-4 bg-background"
          aria-live="assertive"
        >
          <Card className="w-full max-w-lg glass border-white/10" role="alert">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-white">
                {title}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {description}
              </CardDescription>
              {errorId && (
                <div className="text-xs text-muted-foreground/60 mt-2 font-mono">
                  Error ID: {errorId}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                {isRecoverable && retryCount < maxRetries && (
                  <Button 
                    onClick={this.handleRetry} 
                    className="w-full bg-gradient-to-r from-primary to-cyan-600 hover:from-primary/90 hover:to-cyan-700"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {retryCount === 0
                      ? 'Try Again'
                      : `Try Again (${retryCount}/${maxRetries})`}
                  </Button>
                )}

                {retryCount >= maxRetries && (
                  <p className="text-sm text-muted-foreground text-center">
                    Maximum retry attempts reached. Please try other options
                    below.
                  </p>
                )}

                <div className="flex gap-2">
                  {showHomeButton && (
                    <Button
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="flex-1 border-white/10 hover:bg-white/5"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Go Home
                    </Button>
                  )}

                  {showSignOutButton && (
                    <Button
                      variant="outline"
                      onClick={this.handleSignOut}
                      className="flex-1 border-white/10 hover:bg-white/5"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.toggleTechnicalDetails}
                  className="w-full justify-between text-muted-foreground hover:text-white hover:bg-white/5"
                  aria-expanded={showTechnicalDetails}
                  aria-controls="auth-error-technical-details"
                >
                  Technical Details
                  {showTechnicalDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {showTechnicalDetails && (
                  <div
                    id="auth-error-technical-details"
                    className="mt-2 rounded-lg bg-white/5 border border-white/10 p-3"
                  >
                    <div className="text-xs text-muted-foreground space-y-3">
                      <div>
                        <div className="font-medium mb-1 text-white/80">Error Category:</div>
                        <div className="font-mono text-primary">
                          {category}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium mb-1 text-white/80">Error Message:</div>
                        <div className="font-mono break-all bg-black/20 p-2 rounded text-red-300">
                          {error.message || 'Unknown error'}
                        </div>
                      </div>

                      {error.stack && (
                        <div>
                          <div className="font-medium mb-1 text-white/80">Stack Trace:</div>
                          <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-black/20 p-2 rounded max-h-32 overflow-y-auto text-muted-foreground/80">
                            {error.stack}
                          </pre>
                        </div>
                      )}

                      <div>
                        <div className="font-medium mb-1 text-white/80">Component Stack:</div>
                        <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-black/20 p-2 rounded max-h-32 overflow-y-auto text-muted-foreground/80">
                          {this.state.errorInfo?.componentStack ||
                            'No component stack available'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}
