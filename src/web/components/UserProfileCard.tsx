'use client';

import React from 'react';
import { useUserProfile } from '@/core/hooks/useUserProfile';
import { User as UserIcon, Mail, RefreshCw } from 'lucide-react';

export const UserProfileCard = ({ userId }: { userId: string }) => {
  const { user, isLoading, updateName, isUpdating } = useUserProfile(userId);

  if (isLoading) {
    return (
      <div className="animate-pulse p-6 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-w-md w-full">
        <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 bg-white dark:bg-slate-900 shadow-md rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-lg">
          <UserIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user.name}</h2>
          <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-1">
            <Mail className="w-3.5 h-3.5" />
            <span>{user.email}</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => updateName('Novo Nome Web')}
        disabled={isUpdating}
        className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
        <span>{isUpdating ? 'Atualizando...' : 'Atualizar Nome'}</span>
      </button>
    </div>
  );
};
