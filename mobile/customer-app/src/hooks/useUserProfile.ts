import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, UserProfileResponse, UpdateProfilePayload, ChangePasswordPayload } from '../api/user';
import { useAuthStore } from '../stores/authStore';

export const USER_PROFILE_QUERY_KEY = ['user', 'profile'];

export function useUserProfile() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useQuery<UserProfileResponse, Error>({
    queryKey: USER_PROFILE_QUERY_KEY,
    queryFn: userApi.getProfile,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const currentUser = useAuthStore((state) => state.user);

  return useMutation<UserProfileResponse, Error, UpdateProfilePayload>({
    mutationFn: userApi.updateProfile,
    onSuccess: (updatedProfile) => {
      // 1. Update React Query Cache
      queryClient.setQueryData(USER_PROFILE_QUERY_KEY, updatedProfile);

      // 2. Synchronize Auth Store User
      if (currentUser) {
        setUser({
          ...currentUser,
          _id: updatedProfile._id,
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone,
          avatarUrl: updatedProfile.avatarUrl,
          role: updatedProfile.role,
          preferences: updatedProfile.preferences,
        });
      }

      queryClient.invalidateQueries({ queryKey: USER_PROFILE_QUERY_KEY });
    },
  });
}

export function useChangePassword() {
  return useMutation<{ changed: boolean }, Error, ChangePasswordPayload>({
    mutationFn: userApi.changePassword,
  });
}
