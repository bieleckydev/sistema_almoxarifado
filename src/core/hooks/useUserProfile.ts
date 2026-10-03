import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserService } from '../services/user.service';

export const USER_PROFILE_KEY = 'user-profile';

export function useUserProfile(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [USER_PROFILE_KEY, userId],
    queryFn: () => UserService.getUserProfile(userId),
    enabled: Boolean(userId),
  });

  const updateMutation = useMutation({
    mutationFn: (newName: string) => UserService.updateUserName(userId, newName),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData([USER_PROFILE_KEY, userId], updatedUser);
    },
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateName: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
