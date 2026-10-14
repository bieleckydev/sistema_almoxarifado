'use client';

import React from 'react';
import { useUserProfile } from '@/core/hooks/useUserProfile';
import { User as UserIcon, Mail, RefreshCw } from 'lucide-react';

export const UserProfileCard = ({ userId }: { userId: string }) => {
  const { user, isLoading, updateName, isUpdating } = useUserProfile(userId);

  if (isLoading) {
    return (
      <div className="animate-pulse p-5 bg-surface-container-low rounded-2xl border border-outline-variant/20 max-w-md w-full">
        <div className="h-5 bg-surface-container-high rounded-xl w-1/2 mb-2"></div>
        <div className="h-4 bg-surface-container rounded-xl w-3/4"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm max-w-md w-full">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary-container/10 border border-primary/20 text-primary flex items-center justify-center">
          <UserIcon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-headline text-sm font-semibold text-on-surface">{user.name}</h2>
          <div className="flex items-center text-xs text-on-surface-variant gap-1.5 mt-0.5">
            <Mail className="w-3.5 h-3.5 text-outline" />
            <span>{user.email}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => updateName('Novo Nome Web')}
        disabled={isUpdating}
        className="mt-3 flex items-center justify-center gap-2 w-full h-9 px-3 bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
        <span>{isUpdating ? 'Atualizando...' : 'Atualizar Nome'}</span>
      </button>
    </div>
  );
};
