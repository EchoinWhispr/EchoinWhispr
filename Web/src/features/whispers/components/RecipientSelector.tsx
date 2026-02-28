'use client';

import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { ChevronDown, ChevronUp, Users, Search } from 'lucide-react';
import debounce from 'lodash.debounce';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUserSearch } from '@/features/users/hooks/useUserSearch';
import { UserSearchResult } from '@/features/users/types';

interface RecipientSelectorProps {
  selectedRecipient: UserSearchResult | null;
  onRecipientSelect: (recipient: UserSearchResult) => void;
}

export const RecipientSelector = ({
  selectedRecipient,
  onRecipientSelect,
}: RecipientSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { query, results, isLoading, setQuery } = useUserSearch();

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectRecipient = (user: UserSearchResult) => {
    onRecipientSelect(user);
    setIsOpen(false);
    setQuery(''); // Clear search
  };

  // Debounce the actual query update to prevent spamming the backend
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setQuery(searchTerm);
    }, 500),
    [setQuery]
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  // Local state for immediate typing feedback
  const [localQuery, setLocalQuery] = useState('');

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    debouncedSearch(value);
  };

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative w-full">
      {/* Main Button Container */}
      <div className="flex gap-2">
        {/* Clickable recipient display button */}
        <Button
          type="button"
          variant="outline"
          className="flex-1 justify-start glass border-white/10 text-white hover:bg-white/10"
          onClick={handleToggleDropdown}
        >
          <Users className="w-4 h-4 mr-2 text-primary" />
          {selectedRecipient ? selectedRecipient.username : 'Select Recipient'}
        </Button>

        {/* Dropdown toggle button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleToggleDropdown}
          className="px-3 bg-gradient-to-r from-primary to-cyan-600 border-transparent text-white hover:from-primary/90 hover:to-cyan-700"
        >
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Dropdown Popup */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 glass border-white/10 shadow-2xl">
          <CardContent className="p-4">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search users by username..."
                value={localQuery}
                onChange={handleSearchChange}
                className="pl-10 bg-secondary/50 border-white/10 text-white placeholder:text-muted-foreground"
                autoFocus
              />
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="text-center text-primary py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <span className="text-muted-foreground">Searching users...</span>
              </div>
            ) : results.length === 0 && query.trim() ? (
              <div className="text-center text-muted-foreground py-4">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No users found
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-48 overflow-y-auto">
                {results.map(user => (
                  <button
                    key={user._id}
                    onClick={() => handleSelectRecipient(user)}
                    className="w-full px-3 py-2 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors rounded"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/30 to-cyan-500/30 rounded-full flex items-center justify-center mr-3 border border-white/10">
                        <span className="text-primary font-medium text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white">{user.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.trim() === '' ? (
              <div className="text-center text-muted-foreground py-4">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Start typing to search users
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
