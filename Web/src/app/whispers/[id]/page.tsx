'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import { validateFile } from '@/lib/fileValidation';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/convex';
import { useQuery, useMutation } from 'convex/react';
import { Id } from '@/lib/convex';
import { Shield, ArrowLeft, Copy, Send, Image as ImageIcon, Loader2, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toPng } from 'html-to-image';

export default function WhisperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const idParam = params.id as string;
  const isValidId = typeof idParam === 'string' && /^[a-zA-Z0-9]{16,32}$/.test(idParam);
  const whisperId = isValidId ? idParam as Id<'whispers'> : null;
  const whisperCardRef = useRef<HTMLDivElement>(null);

  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const whisper = useQuery(
    api.whispers.getWhisperById,
    whisperId ? { whisperId } : 'skip'
  );

  const echoWhisper = useMutation(api.conversations.echoWhisper);
  const { upload, isUploading } = useFileUpload();

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

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  if (!isValidId) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
        <div className="w-full max-w-3xl">
          <div className="glass p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h1 className="text-2xl font-bold mb-2">Invalid Whisper ID</h1>
            <p className="text-muted-foreground mb-4">The whisper ID format is not valid.</p>
            <Button onClick={() => router.push('/whispers')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Whispers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Handles sending a reply that creates a conversation
   */
  const handleReply = async () => {
    const hasContent = replyContent.trim().length > 0;
    const hasImage = !!selectedImage;
    
    if (!hasContent && !hasImage) return;
    if (!whisper) return;

    setIsReplying(true);
    try {
      let imageUrl: string | undefined;
      if (selectedImage) {
        const uploadResult = await upload(selectedImage);
        imageUrl = uploadResult.url;
      }

      await echoWhisper({
        whisperId: whisper._id as Id<'whispers'>,
        replyContent: replyContent.trim() || '[Image]',
        imageUrl,
      });

      toast({
        title: 'Echo request sent!',
        description: 'Your conversation has been started.',
      });

      router.push('/conversations');
    } catch (error) {
      console.error('Failed to echo whisper:', error);
      toast({
        title: 'Failed to send reply',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsReplying(false);
    }
  };

  /**
   * Copies the whisper content to the clipboard
   */
  const handleCopy = () => {
    if(!whisper) return;
    navigator.clipboard.writeText(whisper.content);
    toast({ title: 'Copied to clipboard!' });
  };

  /**
   * Saves the whisper as a downloadable image
   */
  const handleSaveAsImage = async () => {
    if (!whisperCardRef.current || !whisper) return;

    setIsSaving(true);
    try {
      const dataUrl = await toPng(whisperCardRef.current, {
        quality: 1,
        backgroundColor: '#0a0a0f',
        pixelRatio: 2,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `whisper-${whisper._id.slice(-6)}.png`;
      link.href = dataUrl;
      link.click();

      toast({ title: 'Whisper saved!', description: 'Image downloaded to your device.' });
    } catch (error) {
      console.error('Failed to save whisper as image:', error);
      toast({ title: 'Failed to save', description: 'Could not generate image.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const formattedTime = whisper
    ? formatDistanceToNow(new Date(whisper._creationTime), { addSuffix: true })
    : '';

  // The Convex backend already enforces that only recipients can access whispers
  const isRecipient: boolean = !!whisper;

  // Check if reply button should be disabled
  const isReplyDisabled = (!replyContent.trim() && !selectedImage) || isReplying || isUploading;

  // Loading state skeleton matching the new design
  if (!whisper) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
        <div className="w-full max-w-3xl space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-10 w-10 bg-primary/20 rounded-lg animate-pulse" />
            <div className="h-8 w-48 bg-primary/10 rounded-lg animate-pulse" />
          </div>
          
          <div className="glass p-8 rounded-2xl border border-white/10 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-white/5 rounded-full animate-pulse" />
              <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Whisper Details</h1>
              <p className="text-muted-foreground text-sm">View and respond to this whisper</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Whisper Card - with ref for screenshot */}
          <div 
            ref={whisperCardRef}
            className="glass p-8 rounded-2xl border border-white/10 relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary/50 to-accent/50" />
            
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2.5 rounded-xl">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">Anonymous Whisper</h2>
                    <p className="text-xs text-muted-foreground">{formattedTime}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveAsImage}
                    disabled={isSaving}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-lg leading-relaxed text-foreground/90">
                  {whisper.content}
                </p>
              </div>

              {FEATURE_FLAGS.IMAGE_UPLOADS && whisper.imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <Image
                    alt="Whisper Image"
                    className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                    src={whisper.imageUrl}
                    width={800}
                    height={600}
                  />
                </div>
              )}

              {/* Branding for saved image */}
              <div className="flex items-center justify-center pt-4 border-t border-white/10">
                <span className="text-sm text-muted-foreground font-medium">EchoinWhispr</span>
              </div>
            </div>
          </div>

          {/* Reply Section */}
          {isRecipient ? (
            <div className="glass p-6 rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Send a Reply
              </h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <Textarea
                    placeholder="Type your reply here... (or just attach an image)"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    maxLength={280}
                    className="min-h-[120px] bg-secondary/20 border-white/10 focus-visible:ring-primary resize-none pr-12"
                  />
                  {FEATURE_FLAGS.IMAGE_UPLOADS && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute bottom-3 right-3 hover:bg-white/10 ${selectedImage ? 'text-primary' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-5 h-5" />
                    </Button>
                  )}
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative inline-block animate-in fade-in slide-in-from-bottom-2">
                    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5 max-w-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-32 w-auto object-contain"
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

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {replyContent.length}/280 characters
                  </span>
                  <Button
                    onClick={handleReply}
                    disabled={isReplyDisabled}
                    className="px-8"
                  >
                    {isReplying || isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isUploading ? 'Uploading...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        Reply
                        <Send className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="glass p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-3 text-yellow-500">
                <Shield className="w-5 h-5" />
                <p className="font-medium">You can only reply to whispers that were sent to you.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
