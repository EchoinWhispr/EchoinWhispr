'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useConvexAuth } from 'convex/react';
import { useToast } from '@/hooks/use-toast';
import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex';

/**
 * Authentication state machine states
 */
type AuthState =
  | 'initializing' // Initial state, checking authentication
  | 'authenticated' // User is fully authenticated with username
  | 'processing' // Currently processing user creation/update
  | 'error' // Error occurred during authentication
  | 'retrying'; // Retrying after an error

/**
 * Interface representing the authenticated user data structure
 */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  imageUrl: string;
  firstName?: string;
  lastName?: string;
  createdAt?: number;
}

/**
 * Interface representing the return type of the useAuthStatus hook
 */
export interface UseAuthStatusReturn {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  isSignedIn: boolean;
  isConvexAuthenticated: boolean;

  // User data
  user: AuthUser | null;

  // User creation status
  isProcessing: boolean;
  isCreatingUser: boolean;
  userCreationError: string | null;
  retryCount: number;

  // Username selection state
  isUsernameSelectionOpen: boolean;
  showUsernamePicker: () => void;
  hideUsernamePicker: () => void;
  onUsernameSelected: (username: string) => Promise<void>;

  // Actions
  signOut: () => Promise<void>;
  resetRetryState: () => void;

  // Raw data for advanced use cases
  clerkUser: ReturnType<typeof useUser>['user'];
  isClerkLoaded: boolean;
  isConvexLoading: boolean;
}

/**
 * Maximum retry attempts for user creation
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Custom hook for managing authentication status and user information
 * Uses a state machine pattern to prevent circular dependencies and infinite re-renders
 * Provides unified access to Clerk and Convex authentication state
 * Automatically creates user in Convex when authenticated with Clerk
 *
 * @returns Object containing authentication state, user data, and actions
 */
export function useAuthStatus(): UseAuthStatusReturn {
  // Clerk authentication state
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { signOut } = useAuth();

  // Convex authentication state
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } =
    useConvexAuth();

  // Toast hook for user feedback
  const { toast } = useToast();

  // Mutation for creating/getting user in Convex
  const getOrCreateUserMutation = useMutation(api.users.getOrCreateCurrentUser);
  const updateUsernameMutation = useMutation(api.users.updateUsername);

  // State machine for authentication flow
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [userCreationError, setUserCreationError] = useState<string | null>(
    null
  );
  const [retryCount, setRetryCount] = useState(0);

  // Username selection state
  const [isUsernameSelectionOpen, setIsUsernameSelectionOpen] = useState(false);

  // Refs for preventing race conditions
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastAuthStateRef = useRef<AuthState>('initializing');

  // Computed authentication states using useMemo to prevent unnecessary recalculations
  const isLoading = useMemo(() => {
    // Only show loading when actually initializing or processing
    // If user is not signed in, show sign-in page immediately
    if (!isSignedIn) {
      return false;
    }

    // Show loading only during actual initialization or processing
    const clerkNotReady = !isClerkLoaded;
    const convexStillLoading = isConvexLoading;
    const stillInitializing = authState === 'initializing';

    // Only show loading if we're actually in a loading state
    // Prevent rapid state changes that cause flashing
    // Don't include 'processing' here as it should transition to final states
    return clerkNotReady || convexStillLoading || stillInitializing;
  }, [isClerkLoaded, isConvexLoading, authState, isSignedIn]);

  const isAuthenticated = useMemo(() => {
    // Only consider authenticated if both systems are ready and user is signed in
    const signedIn = isSignedIn ?? false;
    const convexAuth = isConvexAuthenticated ?? false;
    const systemsReady = isClerkLoaded && !isConvexLoading;

    return (
      signedIn && convexAuth && systemsReady && authState === 'authenticated'
    );
  }, [
    isSignedIn,
    isConvexAuthenticated,
    isClerkLoaded,
    isConvexLoading,
    authState,
  ]);

  // User information - safely extract user data from Clerk user object
  // Note: createdAt will be populated from Convex user data when available
  const user = useMemo(
    () =>
      clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            fullName: clerkUser.fullName || '',
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
            username: clerkUser.username || '',
            imageUrl: clerkUser.imageUrl || '',
            createdAt: undefined, // Will be populated from Convex data
          }
        : null,
    [clerkUser]
  );

  // Function to refetch user data after username update
  const refetchUser = useCallback(async () => {
    try {
      await getOrCreateUserMutation();
    } catch (error) {
      console.error('Error refetching user data:', error);
      throw error;
    }
  }, [getOrCreateUserMutation]);

  // Memoized function to call the mutation with proper error handling
  const getOrCreateUser = useCallback(async () => {
    try {
      return await getOrCreateUserMutation();
    } catch (error) {
      console.error('Error in getOrCreateUser mutation:', error);
      throw error;
    }
  }, [getOrCreateUserMutation]);

  // State machine transition function with safeguards
  const transitionToState = useCallback(
    (newState: AuthState, error?: string | null) => {
      // Prevent unnecessary state transitions
      if (lastAuthStateRef.current === newState) {
        return;
      }

      // Prevent rapid state changes that could cause flashing
      if (
        isProcessingRef.current &&
        newState !== 'processing' &&
        newState !== 'error'
      ) {
        return;
      }

      lastAuthStateRef.current = newState;
      setAuthState(newState);
      if (error !== undefined) {
        setUserCreationError(error);
      }
    },
    []
  );

  // Retry function with proper state management and race condition prevention
  const retryUserCreation = useCallback(
    async (attemptNumber: number) => {
      // Prevent concurrent retries
      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;
      transitionToState('processing');

      try {
        // Attempt to get or create the user in Convex
        await getOrCreateUser();

        // Success - user is fully authenticated
        isProcessingRef.current = false;
        transitionToState('authenticated');
        setRetryCount(0);
        setUserCreationError(null);
      } catch (error) {
        console.error('Error creating/getting user in Convex:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to sync user data';

        // Increment retry count
        const newRetryCount = attemptNumber;
        setRetryCount(newRetryCount);

        // Show error toast with retry information
        toast({
          title: 'Authentication Error',
          description:
            newRetryCount >= MAX_RETRY_ATTEMPTS
              ? 'Unable to sync your account after multiple attempts. Please try refreshing the page or contact support if the issue persists.'
              : `There was an issue syncing your account. Retrying... (${newRetryCount}/${MAX_RETRY_ATTEMPTS})`,
          variant: 'destructive',
        });

        // Schedule retry with exponential backoff if we haven't exceeded max retries
        if (newRetryCount < MAX_RETRY_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 30000); // Exponential backoff, max 30s

          retryTimeoutRef.current = setTimeout(() => {
            retryUserCreation(newRetryCount + 1);
          }, delay);
        } else {
          // Max retries exceeded, transition to error state
          transitionToState('error', errorMessage);
        }
      } finally {
        isProcessingRef.current = false;
      }
    },
    [getOrCreateUser, toast, transitionToState]
  );

  // Main authentication effect - runs only when core auth state changes
  useEffect(() => {
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Prevent multiple initializations
    if (hasInitializedRef.current) {
      return;
    }

    const initializeAuth = async () => {
      // Only proceed if:
      // 1. Clerk user is loaded and signed in
      // 2. Convex is authenticated
      // 3. We're not already processing
      // 4. We haven't exceeded max retries
      if (
        !isClerkLoaded ||
        !isSignedIn ||
        !isConvexAuthenticated ||
        isProcessingRef.current ||
        retryCount >= MAX_RETRY_ATTEMPTS
      ) {
        return;
      }

      // Set initialized flag BEFORE attempting user creation to prevent race conditions
      hasInitializedRef.current = true;

      try {
        await retryUserCreation(1);
      } catch (error) {
        // Even if retryUserCreation fails, we've initialized, so don't reset the flag
        console.error('Authentication initialization failed:', error);
      }
    };

    initializeAuth();

    // Cleanup function to clear timeout on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [
    isClerkLoaded,
    isSignedIn,
    isConvexAuthenticated,
    retryCount,
    retryUserCreation,
  ]);

  // Clear error when user successfully authenticates
  useEffect(() => {
    if (isAuthenticated && userCreationError) {
      setUserCreationError(null);
      setRetryCount(0);
    }
  }, [isAuthenticated, userCreationError]);

  /**
   * Reset retry count and error state
   * Useful for manual retry attempts or when user wants to try again
   */
  const resetRetryState = useCallback(() => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    isProcessingRef.current = false;
    hasInitializedRef.current = false;

    setRetryCount(0);
    setUserCreationError(null);
    setAuthState('initializing');
  }, []);

  /**
   * Sign out the current user from both Clerk and Convex
   * Handles errors gracefully and provides user feedback via toast notifications
   */
  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      // Clear any pending retry before signing out
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      isProcessingRef.current = false;
      hasInitializedRef.current = false;

      await signOut();
      // Reset all state on successful sign out
      setAuthState('initializing');
      setUserCreationError(null);
      setRetryCount(0);
      setIsUsernameSelectionOpen(false);

      toast({
        title: 'Signed out successfully',
        description: 'You have been signed out of your account.',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Sign out failed',
        description: 'There was an error signing out. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [signOut, toast]);

  // Username selection functions
  const showUsernamePicker = useCallback(() => {
    setIsUsernameSelectionOpen(true);
  }, []);

  const hideUsernamePicker = useCallback(() => {
    setIsUsernameSelectionOpen(false);
  }, []);

  const onUsernameSelected = useCallback(
    async (username: string) => {
      if (!username.trim()) {
        toast({
          title: 'Username Required',
          description: 'Please enter a username to continue.',
          variant: 'destructive',
        });
        return;
      }

      try {
        setIsUsernameSelectionOpen(false);
        transitionToState('processing');

        // Update the user with the chosen username
        await updateUsernameMutation({
          username: username.trim(),
        });

        // Refresh the user data to get the updated user
        await refetchUser();

        // Success - transition to authenticated state
        transitionToState('authenticated');

        toast({
          title: 'Username Set',
          description: 'Your username has been successfully set!',
        });
      } catch (error) {
        console.error('Error updating username:', error);
        toast({
          title: 'Error',
          description: 'Failed to set username. Please try again.',
          variant: 'destructive',
        });
        setIsUsernameSelectionOpen(true); // Re-open modal on error
        transitionToState('authenticated'); // Stay authenticated even if username update fails
      }
    },
    [updateUsernameMutation, refetchUser, toast, transitionToState]
  );

  return {
    // Authentication state
    isAuthenticated,
    isLoading,
    isSignedIn: isSignedIn ?? false,
    isConvexAuthenticated: isConvexAuthenticated ?? false,

    // User data
    user,

    // User creation status
    isProcessing: authState === 'processing',
    isCreatingUser: authState === 'processing',
    userCreationError,
    retryCount,

    // Username selection state
    isUsernameSelectionOpen,
    showUsernamePicker,
    hideUsernamePicker,
    onUsernameSelected,

    // Actions
    signOut: handleSignOut,
    resetRetryState,

    // Raw data for advanced use cases
    clerkUser,
    isClerkLoaded,
    isConvexLoading,
  };
}
