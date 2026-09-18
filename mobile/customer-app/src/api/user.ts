import { apiClient } from './client';
import { User } from '../stores/authStore';

export interface UserProfileResponse {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
  preferences?: {
    theme?: string;
    notificationPreferences?: {
      orderUpdates?: boolean;
      deliveryAlerts?: boolean;
      paymentAlerts?: boolean;
      promotions?: boolean;
    };
  };
  createdAt?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  email?: string;
  avatarUri?: string;
  notificationPreferences?: {
    orderUpdates?: boolean;
    deliveryAlerts?: boolean;
    paymentAlerts?: boolean;
    promotions?: boolean;
  };
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const userApi = {
  getProfile: async (): Promise<UserProfileResponse> => {
    const response = await apiClient.get<{ success: boolean; data: UserProfileResponse }>('/user/profile');
    return response.data.data;
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<UserProfileResponse> => {
    if (payload.avatarUri && !payload.avatarUri.startsWith('http')) {
      const formData = new FormData();

      const filename = payload.avatarUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const type = ext === 'png' ? 'image/png' : 'image/jpeg';

      formData.append('avatar', {
        uri: payload.avatarUri,
        name: filename,
        type,
      } as any);

      if (payload.name) formData.append('name', payload.name);
      if (payload.phone) formData.append('phone', payload.phone);
      if (payload.email) formData.append('email', payload.email);

      const response = await apiClient.patch<{ success: boolean; data: UserProfileResponse }>(
        '/user/profile',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.data;
    } else {
      const body: Record<string, any> = {};
      if (payload.name !== undefined) body.name = payload.name;
      if (payload.phone !== undefined) body.phone = payload.phone;
      if (payload.email !== undefined) body.email = payload.email;
      if (payload.avatarUri && payload.avatarUri.startsWith('http')) {
        body.avatarUrl = payload.avatarUri;
      }
      if (payload.notificationPreferences !== undefined) {
        body.notificationPreferences = payload.notificationPreferences;
      }

      const response = await apiClient.patch<{ success: boolean; data: UserProfileResponse }>(
        '/user/profile',
        body
      );
      return response.data.data;
    }
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<{ changed: boolean }> => {
    const response = await apiClient.post<{ success: boolean; data: { changed: boolean } }>(
      '/user/security/change-password',
      payload
    );
    return response.data.data;
  },
};
