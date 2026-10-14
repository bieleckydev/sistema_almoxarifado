'use client';

import React from 'react';
import { useUserProfile } from '@/core/hooks/useUserProfile';
import { User as UserIcon, Mail, RefreshCw } from 'lucide-react';

export const UserProfileCard = ({ userId }: { userId: string }) => {
  const { user, isLoading, updateName, isUpdating } = useUserProfile(userId);

  if (isLoading) {
    return (
      <div className="animate-pulse p-5 bg-slate-100 dark:bg-[#2b2b2e] rounded-lg border border-slate-200 dark:border-[#3e3e42] max-w-md w-full">
        <div className="h-5 bg-slate-300 dark:bg-[#3e3e42] rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-slate-200 dark:bg-[#343438] rounded w-3/4"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-5 bg-white dark:bg-[#2b2b2e] rounded-lg border border-slate-200 dark:border-[#3e3e42] max-w-md w-full">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-[#232325] border border-slate-200 dark:border-[#3e3e42] text-slate-700 dark:text-slate-200 flex items-center justify-center">
          <UserIcon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</h2>
          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-1 mt-0.5">
            <Mail className="w-3.5 h-3.5" />
            <span>{user.email}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => updateName('Novo Nome Web')}
        disabled={isUpdating}
        className="mt-3 flex items-center justify-center gap-1.5 w-full h-8 px-3 bg-[#1d4ea3] dark:bg-[#3273dc] hover:bg-blue-800 dark:hover:bg-blue-600 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
        <span>{isUpdating ? 'Atualizando...' : 'Atualizar Nome'}</span>
      </button>
    </div>
  );
};
