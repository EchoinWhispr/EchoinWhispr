'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import { validateFile } from '@/lib/fileValidation';
import { 
  ArrowLeft, 
  Send, 
  Users, 
  Copy, 
  Settings,
  Radio,
  Trash2,
  LogOut,
  Edit2,
  AlertTriangle,
  Image as ImageIcon,
  X,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Id } from '@/lib/convex';

export default function ChamberViewPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAliasConfirm, setShowAliasConfirm] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  
  // Image viewer state
  const [viewingImage, setViewingImage] = useState<{ url: string; caption?: string; senderAlias?: string } | null>(null);
  
  // Chamber editing state (for creators)
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const { upload, isUploading } = useFileUpload();

  // Validate id from useParams before using
  const validId = typeof id === 'string' && id.length > 0 ? id : null;

  const chamber = useQuery(
    api.echoChambers.getChamber, 
    validId ? { chamberId: validId as Id<'echoChambers'> } : 'skip'
  );
  const messagesData = useQuery(
    api.echoChambers.getMessages, 
    validId ? { chamberId: validId as Id<'echoChambers'>, limit: 50 } : 'skip'
  );
  const typingUsers = useQuery(
    api.echoChambers.getTypingIndicators,
    validId ? { chamberId: validId as Id<'echoChambers'> } : 'skip'
  );

  const sendMessage = useMutation(api.echoChambers.sendMessage);
  const setTyping = useMutation(api.echoChambers.setTyping);
  const leaveChamber = useMutation(api.echoChambers.leaveChamber);
  const deleteChamber = useMutation(api.echoChambers.deleteChamber);
  const updateAlias = useMutation(api.echoChambers.updateAlias);
  const updateLastReadAt = useMutation(api.echoChambers.updateLastReadAt);
  const updateChamber = useMutation(api.echoChambers.updateChamber);

  // Track initial unread count for the session (stored once on mount)
  const [initialUnreadCount, setInitialUnreadCount] = useState<number | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Mark messages as read when entering the chamber and track unread count
  const hasUpdatedLastRead = useRef(false);
  
  useEffect(() => {
    if (!validId || !chamber || !messagesData) return;
    
    // Store the initial unread count (only once)
    if (initialUnreadCount === null && chamber.userLastReadAt !== undefined) {
      const lastRead = chamber.userLastReadAt || 0;
      
      // Count unread messages (messages after lastReadAt)
      const unreadMessages = messagesData.messages?.filter(
        (msg) => msg.createdAt > lastRead
      ) || [];
      setInitialUnreadCount(unreadMessages.length);
    }
    
    // Update lastReadAt in the backend (only once per session)
    if (!hasUpdatedLastRead.current && chamber.userLastReadAt !== undefined) {
      hasUpdatedLastRead.current = true;
      updateLastReadAt({ chamberId: validId as Id<'echoChambers'> }).catch(console.error);
    }
  }, [validId, chamber, messagesData, initialUnreadCount, updateLastReadAt]);

  // Handle ?settings=true query param
  useEffect(() => {
    if (searchParams.get('settings') === 'true') {
      setShowSettings(true);
      // Clear the query param from URL
      router.replace(`/chambers/${validId}`);
    }
  }, [searchParams, validId, router]);

  // Typing indicator with debounce
  const handleTyping = useCallback(() => {
    if (!validId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setTyping({ chamberId: validId as Id<'echoChambers'> });
    }, 300);
  }, [validId, setTyping]);

  // Image handling
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

  // Cleanup blob URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleSend = async () => {
    const hasContent = message.trim().length > 0;
    const hasImage = !!selectedImage;
    
    if ((!hasContent && !hasImage) || !validId) return;

    setIsSending(true);
    try {
      let imageUrl: string | undefined;
      if (selectedImage) {
        const uploadResult = await upload(selectedImage);
        imageUrl = uploadResult.url;
      }

      await sendMessage({
        chamberId: validId as Id<'echoChambers'>,
        content: message.trim() || '[Image]',
        imageUrl,
      });
      if (isMountedRef.current) {
        setMessage('');
        handleRemoveImage();
      }
    } catch (error) {
      console.error('Send error:', error);
      if (isMountedRef.current) {
        toast({
          title: "Failed to send",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsSending(false);
      }
    }
  };

  const handleLeave = async () => {
    if (!validId) return;

    setIsActionPending(true);
    try {
      await leaveChamber({ chamberId: validId as Id<'echoChambers'> });
      toast({
        title: "Left chamber",
        description: "You've left this echo chamber.",
      });
      router.push('/chambers');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Cannot leave",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDelete = async () => {
    if (!validId) return;

    setIsActionPending(true);
    try {
      await deleteChamber({ chamberId: validId as Id<'echoChambers'> });
      toast({
        title: "Chamber deleted",
        description: "The chamber has been permanently deleted.",
      });
      router.push('/chambers');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Cannot delete",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/chambers/join/${chamber?.inviteCode}`);
      toast({
        title: "Link copied!",
        description: "Share it with others to join.",
      });
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: "Copy failed",
        description: "Please copy the invite code manually.",
        variant: "destructive",
      });
    }
  };

  const handleAliasChange = async () => {
    if (!validId || !newAlias.trim()) return;

    if (newAlias.trim().length < 2) {
      toast({
        title: "Alias too short",
        description: "Alias must be at least 2 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsActionPending(true);
    try {
      const result = await updateAlias({
        chamberId: validId as Id<'echoChambers'>,
        newAlias: newAlias.trim(),
      });
      toast({
        title: "Alias updated!",
        description: `You are now "${result.newAlias}"`,
      });
      setShowAliasConfirm(false);
      setNewAlias('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Failed to update alias",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsActionPending(false);
    }
  };

  if (!chamber) {
    return (
      <div className="min-h-[100dvh] pt-20 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading chamber...</div>
      </div>
    );
  }

  if (!chamber.isMember) {
    return (
      <div className="min-h-[100dvh] pt-20 flex items-center justify-center">
        <Card className="glass border-white/10 p-8 text-center max-w-md">
          <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You need an invite link to join this chamber.
          </p>
          <Link href="/chambers">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chambers
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col">
      {/* Header */}
      <header className="sticky top-16 z-40 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/chambers">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">{chamber.name}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {chamber.memberCount} members
                <span className="mx-1">•</span>
<Badge 
                  variant="secondary" 
                  className="text-xs bg-primary/20 text-primary"
                >
                  {chamber.userAlias}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={copyInviteLink}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messagesData?.messages?.map((msg, index) => {
            // Determine if this is the first unread message
            const previousMsg = index > 0 ? messagesData.messages?.[index - 1] : null;
            const isFirstUnread = initialUnreadCount !== null && 
              initialUnreadCount > 0 &&
              chamber?.userLastReadAt !== undefined &&
              msg.createdAt > (chamber.userLastReadAt || 0) &&
              (!previousMsg || previousMsg.createdAt <= (chamber.userLastReadAt || 0));
            
            return (
              <div key={msg._id}>
                {/* Unread messages divider */}
                {isFirstUnread && (
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 h-px bg-amber-500/50" />
                    <span className="text-xs font-medium text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                      {initialUnreadCount} unread message{initialUnreadCount !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-amber-500/50" />
                  </div>
                )}
                <MessageBubble 
                  message={msg}
                  isOwn={msg.isOwnMessage}
                  onImageClick={(url, caption, senderAlias) => setViewingImage({ url, caption, senderAlias })}
                />
              </div>
            );
          })}
          
          {typingUsers && typingUsers.length > 0 && (
            <div className="text-sm text-muted-foreground italic animate-pulse">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 glass border-t border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative inline-block animate-in fade-in slide-in-from-bottom-2">
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5 max-w-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-24 w-auto object-contain"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 bg-black/60 hover:bg-red-500/80 rounded-full"
                  onClick={handleRemoveImage}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              className={`hover:bg-white/10 ${selectedImage ? 'text-primary' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
            <Input
              placeholder="Type a message... (or just attach an image)"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1"
            />
            <Button 
              onClick={handleSend}
              disabled={(!message.trim() && !selectedImage) || isSending || isUploading}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600"
            >
              <Send className="w-4 h-4" />
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

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={(open) => {
        setShowSettings(open);
        if (open && chamber) {
          // Initialize edit fields when opening
          setEditName(chamber.name || '');
          setEditDescription(chamber.description || '');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chamber Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Creator-only editing section */}
            {chamber.userRole === 'creator' && (
              <div className="space-y-4 p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <p className="text-sm font-medium text-emerald-400">Edit Chamber Details</p>
                
                <div>
                  <label className="text-sm text-muted-foreground">Chamber Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Chamber name"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground">Description</label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Chamber description (optional)"
                    className="mt-1"
                  />
                </div>
                
                <Button 
                  size="sm"
                  onClick={async () => {
                    if (!validId || !editName.trim()) return;
                    setIsActionPending(true);
                    try {
                      await updateChamber({
                        chamberId: validId as Id<'echoChambers'>,
                        name: editName.trim(),
                        description: editDescription.trim() || undefined,
                      });
                      toast({ title: 'Chamber updated!' });
                    } catch (error) {
                      toast({ 
                        title: 'Update failed', 
                        description: error instanceof Error ? error.message : 'Unknown error',
                        variant: 'destructive' 
                      });
                    } finally {
                      setIsActionPending(false);
                    }
                  }}
                  disabled={isActionPending || !editName.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isActionPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
            
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
              <code className="text-lg font-mono tracking-wider">
                {chamber.inviteCode}
              </code>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Your Identity</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
<Badge className="bg-primary/20 text-primary">
                    {chamber.userAlias}
                  </Badge>
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: chamber.userColor }}
                  />
                </div>
                {!chamber.hasChangedAlias && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setNewAlias(chamber.userAlias || '');
                      setShowAliasConfirm(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Change
                  </Button>
                )}
              </div>
              {chamber.hasChangedAlias && (
                <p className="text-xs text-muted-foreground mt-2">
                  Alias has already been changed (one-time only)
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            {chamber.userRole === 'creator' ? (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isActionPending}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Chamber
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={handleLeave}
                disabled={isActionPending}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Chamber
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alias Change Confirmation Dialog */}
      <Dialog open={showAliasConfirm} onOpenChange={setShowAliasConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Change Your Alias
            </DialogTitle>
            <DialogDescription className="text-amber-400">
              ⚠️ Warning: You can only change your alias ONCE. This cannot be undone!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-400">
                Your current alias is <strong>&quot;{chamber.userAlias}&quot;</strong>. After changing, you cannot change it again.
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">New Alias (2-30 characters)</label>
              <Input
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="Enter new alias..."
                maxLength={30}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowAliasConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAliasChange}
              disabled={isActionPending || newAlias.trim().length < 2}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isActionPending ? "Saving..." : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent hideCloseButton className="sm:max-w-3xl p-0 overflow-hidden bg-black/95 border-white/10">
          <div className="relative">
            {/* Header with attribution */}
            <div className="p-4 pb-2 flex items-start justify-between">
              <div className="flex-1 pr-20">
                <h3 className="font-semibold text-white">Anonymous Whispr</h3>
                <p className="text-sm text-white/80">
                  from <span className="font-semibold text-cyan-400">{viewingImage?.senderAlias || 'Anonymous'}</span> in <span className="font-semibold text-amber-400">{chamber?.name || 'Chamber'}</span>
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {/* Download button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/10 hover:bg-white/20"
                  onClick={async () => {
                    if (viewingImage?.url) {
                      try {
                        const response = await fetch(viewingImage.url);
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        
                        const chamberName = chamber?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'chamber';
                        const sender = viewingImage.senderAlias?.replace(/[^a-zA-Z0-9]/g, '_') || 'user';
                        const filename = `${chamberName}_${sender}_${Date.now()}.jpg`;
                        
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(blobUrl);
                        
                        toast({ title: 'Image downloaded!' });
                      } catch (error) {
                        console.error('Download failed:', error);
                        toast({ title: 'Download failed', variant: 'destructive' });
                      }
                    }
                  }}
                >
                  <Download className="w-5 h-5" />
                </Button>
                
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/10 hover:bg-white/20"
                  onClick={() => setViewingImage(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Image */}
            {viewingImage?.url && (
              <div className="w-full flex items-center justify-center p-4 pt-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={viewingImage.url} 
                  alt="Full view" 
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                />
              </div>
            )}
            
            {/* Caption */}
            {viewingImage?.caption && viewingImage.caption !== '[Image]' && (
              <div className="p-4 pt-2 text-center text-white/80 border-t border-white/10">
                {viewingImage.caption}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message, isOwn, onImageClick }: { message: {
  _id: Id<'echoChamberMessages'>;
  isOwnMessage: boolean;
  aliasColor?: string;
  anonymousAlias?: string;
  content: string;
  createdAt: number;
  imageUrl?: string;
}; isOwn: boolean; onImageClick?: (url: string, caption?: string, senderAlias?: string) => void }) {
  // Provide safe defaults for optional fields
  const aliasColor = message.aliasColor || '#9ca3af'; // neutral gray
  const aliasName = message.anonymousAlias || 'Anonymous';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isOwn 
            ? 'bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-br-md' 
            : 'bg-white/10 rounded-bl-md'
        }`}
      >
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: aliasColor }}
            />
            <span className="text-xs font-medium" style={{ color: aliasColor }}>
              {aliasName}
            </span>
          </div>
        )}
        {/* Message Image - Clickable */}
        {message.imageUrl && (
          <div 
            className="mb-2 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            role="button"
            tabIndex={0}
            onClick={() => onImageClick?.(message.imageUrl!, message.content, isOwn ? 'You' : aliasName)}
            onKeyDown={(e) => e.key === 'Enter' && onImageClick?.(message.imageUrl!, message.content, isOwn ? 'You' : aliasName)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={message.imageUrl} 
              alt="Message attachment" 
              className="max-w-full max-h-60 object-contain rounded-lg"
            />
          </div>
        )}
        {message.content && message.content !== '[Image]' && (
          <p className="text-sm">{message.content}</p>
        )}
        <div className="text-xs text-muted-foreground mt-1 text-right">
          {new Date(message.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
}
