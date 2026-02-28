'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileBio } from './ProfileBio';
import { ProfileForm } from './ProfileForm';
import { ProfileScreenProps, ProfileFormData } from '../types';
import { useProfile, useUpdateProfile } from '../hooks';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';

/**
 * ProfileScreen component manages the main profile display and editing functionality.
 * Shows user information in read-only mode and allows editing when "Edit Profile" is clicked.
 *
 * @param profile - Current user's profile data
 * @param displayName - User's display name from Clerk
 * @param username - User's username from Clerk
 * @param isLoading - Whether profile data is loading
 * @param error - Error message if profile loading failed
 * @param className - Additional CSS classes
 */
export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile: initialProfile,
  displayName: initialDisplayName,
  username: initialUsername,
  isLoading: initialIsLoading,
  error: initialError,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Get current user from Clerk
  const { user } = useUser();

  // Use profile hook to get current profile data
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile();

  // Use update profile hook
  const { updateProfile, isLoading: updateLoading } = useUpdateProfile();
  
  // Toast for error handling
  const { toast } = useToast();

  // Combine props and hook data
  const currentProfile = profile || initialProfile;
  const currentDisplayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || user?.lastName || initialDisplayName || '';
  const currentUsername = user?.username || initialUsername || '';
  const isLoading = profileLoading || initialIsLoading;
  const errorMessage = profileError?.message || initialError;

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async (formData: ProfileFormData) => {
    try {
      await updateProfile({
        bio: formData.bio,
        career: formData.career,
        interests: formData.interests ? formData.interests.split(',').map(i => i.trim()).filter(Boolean) : undefined,
        mood: formData.mood,
        displayName: formData.displayName,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: "Failed to save profile",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className={`max-w-2xl mx-auto p-6 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-24 w-24 bg-muted rounded-full mx-auto"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4 mx-auto"></div>
                <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/6"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={`max-w-2xl mx-auto p-6 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p>Failed to load profile: {errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto p-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <ProfileAvatar
            profile={currentProfile ?? null}
            displayName={currentDisplayName}
            username={currentUsername}
          />

          {/* User Info Section */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">
              {currentDisplayName || 'Anonymous User'}
            </h2>
            {currentUsername && (
              <p className="text-muted-foreground">@{currentUsername}</p>
            )}
            {currentProfile?.career && (
              <p className="text-sm text-muted-foreground">{currentProfile.career}</p>
            )}
            {currentProfile?.mood && (
              <p className="text-sm">Mood: {currentProfile.mood}</p>
            )}
            {currentProfile?.interests && currentProfile.interests.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {currentProfile.interests.map((interest) => (
                  <span key={interest} className="text-xs bg-secondary px-2 py-1 rounded-full">
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bio Section */}
          {isEditing ? (
            <ProfileForm
              initialBio={currentProfile?.bio || ''}
              initialCareer={currentProfile?.career || ''}
              initialInterests={currentProfile?.interests || []}
              initialMood={currentProfile?.mood || ''}
              initialDisplayName={currentDisplayName}
              onSubmit={handleSave}
              onCancel={handleCancel}
              isSubmitting={updateLoading}
            />
          ) : (
            <ProfileBio bio={currentProfile?.bio} />
          )}

          {/* Edit Button */}
          {!isEditing && (
            <div className="flex justify-center">
              <Button onClick={handleEditToggle} variant="outline">
                Edit Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};