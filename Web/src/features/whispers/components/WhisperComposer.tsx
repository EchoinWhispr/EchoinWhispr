import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useSendWhisper } from '../hooks/useWhispers';
import { useSendMysteryWhisper } from '../hooks/useMysteryWhispers';
import { useLocation } from '@/hooks/useLocation';
import { WHISPER_LIMITS } from '../types';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { useFileUpload } from '@/hooks/useFileUpload';
import { validateFile } from '@/lib/fileValidation';
import { useToast } from '@/hooks/use-toast';
import { RecipientSelector } from './RecipientSelector';
import { UserSearchResult } from '@/features/users/types';
import { Shield, Image as ImageIcon, Send, Loader2, HelpCircle, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface WhisperComposerProps {
  onWhisperSent?: () => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export const WhisperComposer: React.FC<WhisperComposerProps> = ({
  onWhisperSent,
  placeholder = 'Type your whisper here.',
  maxLength = WHISPER_LIMITS.MAX_CONTENT_LENGTH,
  className = '',
}) => {
  const [content, setContent] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isMystery, setIsMystery] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { sendWhisper, isLoading: isSendingWhisper } = useSendWhisper();
  const { sendMysteryWhisper, isLoading: isSendingMystery } = useSendMysteryWhisper();
  const { location, requestLocation, isLoading: isLocating } = useLocation();
  const { upload, isUploading } = useFileUpload();
  const { toast } = useToast();

  const isLoading = isSendingWhisper || isSendingMystery;

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      if (newContent.length <= maxLength) {
        setContent(newContent);
      }
    },
    [maxLength]
  );

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const validation = await validateFile(file);
      if (!validation.isValid) {
        toast({ title: 'Invalid file', description: validation.error, variant: 'destructive' });
        return;
      }
      setSelectedImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } catch (error) {
      console.error('File validation error:', error);
      toast({ title: 'Error', description: 'Failed to validate file', variant: 'destructive' });
    }
  }, [toast]);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [imagePreview]);

  // Cleanup blob URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedContent = content.trim();
      
      // Validation - allow image-only messages
      const hasValidContent = trimmedContent.length >= WHISPER_LIMITS.MIN_CONTENT_LENGTH;
      const hasImage = !!selectedImage;
      
      if (!hasValidContent && !hasImage) {
        return;
      }
      
      if (!isMystery && !selectedRecipient) {
        return;
      }

      try {
        let imageUrl: string | undefined;
        if (selectedImage) {
          const uploadResult = await upload(selectedImage);
          imageUrl = uploadResult.url;
        }

        if (isMystery) {
          await sendMysteryWhisper({
            content: trimmedContent,
            imageUrl,
          });
          toast({ title: 'Mystery Whisper Sent!', description: 'Your whisper has been sent to a random soul.' });
        } else {
          if (!selectedRecipient) return;
          await sendWhisper({
            recipientUsername: selectedRecipient.username,
            content: trimmedContent,
            imageUrl,
            location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
          });
          toast({ title: 'Whisper Sent', description: `Sent to ${selectedRecipient.username}` });
        }

        setContent('');
        setSelectedRecipient(null);
        handleRemoveImage();
        onWhisperSent?.();
      } catch (error) {
        console.error('Failed to send whisper:', error);
        toast({ 
          title: 'Failed to send whisper', 
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive' 
        });
      }
    },
    [content, selectedRecipient, selectedImage, isMystery, location, sendWhisper, sendMysteryWhisper, upload, onWhisperSent, toast, handleRemoveImage]
  );

  const validationHint = useMemo(() => {
    if (!content.trim().length && !selectedImage) return 'Enter a message or attach an image';
    if (!isMystery && !selectedRecipient) return 'Select a recipient';
    if (content.length > maxLength) return 'Message is too long';
    return null;
  }, [content, selectedImage, isMystery, selectedRecipient, maxLength]);

  const isDisabled = !!validationHint || isLoading || isUploading;

  return (
    <div className={`space-y-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            {isMystery ? <HelpCircle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            <p className="font-medium">{isMystery ? 'Mystery Whisper' : 'Anonymous Whisper'}</p>
          </div>
          
          {FEATURE_FLAGS.MYSTERY_WHISPERS && (
            <div className="flex items-center space-x-2">
              <Switch 
                id="mystery-mode" 
                checked={isMystery}
                onCheckedChange={setIsMystery}
              />
              <Label htmlFor="mystery-mode" className="text-sm cursor-pointer">Mystery Mode</Label>
            </div>
          )}
        </div>
        
        {!isMystery && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label htmlFor="recipient-selector" className="text-sm font-medium text-muted-foreground ml-1">
              To:
            </label>
            <RecipientSelector
              selectedRecipient={selectedRecipient}
              onRecipientSelect={setSelectedRecipient}
            />
          </div>
        )}

        {isMystery && (
          <div className="p-4 rounded-lg bg-secondary/20 border border-primary/20 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-300">
            <p>Your whisper will be sent to a random user. Destiny awaits!</p>
          </div>
        )}

        <div className="relative group">
          <Textarea
            id="whisper-textarea"
            placeholder={isMystery ? "Whisper something to the universe..." : placeholder}
            value={content}
            onChange={handleContentChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            maxLength={maxLength}
            className="min-h-[120px] sm:min-h-[160px] resize-none p-4 pr-12 bg-secondary/30 border-white/10 focus:border-primary/50 focus:ring-primary/20 text-lg transition-all duration-300"
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
             {FEATURE_FLAGS.LOCATION_BASED_FEATURES && !isMystery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`hover:bg-primary/10 hover:text-primary transition-colors ${location ? 'text-green-500' : ''}`}
                onClick={requestLocation}
                disabled={isLocating || !!location}
                title={location ? "Location added" : "Add location"}
              >
                {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              </Button>
            )}
            {FEATURE_FLAGS.IMAGE_UPLOADS && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`hover:bg-primary/10 hover:text-primary transition-colors ${selectedImage ? 'text-primary' : ''}`}
                onClick={handleImageButtonClick}
              >
                <ImageIcon className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative inline-block animate-in fade-in slide-in-from-bottom-2">
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5 max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-40 w-auto object-contain"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 bg-black/60 hover:bg-red-500/80 rounded-full"
                onClick={handleRemoveImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selectedImage?.name}</p>
          </div>
        )}

        {location && !isMystery && (
           <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
             <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
               <MapPin className="w-3 h-3" />
               Location attached
             </Badge>
           </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {validationHint && (
            <span className="text-xs text-destructive/80">{validationHint}</span>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium ml-1">
              {content.length}/{maxLength} characters
            </span>
            <Button
              type="submit"
              disabled={isDisabled}
              className="px-6 sm:px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-300"
            >
            {isLoading || isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                {isMystery ? 'Send Mystery' : 'Send Whisper'}
                <Send className="w-4 h-4 ml-2" />
              </>
            )}
            </Button>
          </div>
        </div>
        </form>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};