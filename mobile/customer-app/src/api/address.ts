import { apiClient } from './client';
import { UserAddress, ShippingAddress } from '../types/checkout';

export const listAddresses = async (): Promise<UserAddress[]> => {
  const response = await apiClient.get<{ success: boolean; data: UserAddress[] }>('/user/addresses');
  return response.data.data || [];
};

export const createAddress = async (payload: Omit<UserAddress, '_id'>): Promise<UserAddress> => {
  const response = await apiClient.post<{ success: boolean; data: UserAddress }>('/user/addresses', payload);
  return response.data.data;
};

export const updateAddress = async (id: string, payload: Partial<UserAddress>): Promise<UserAddress> => {
  const response = await apiClient.patch<{ success: boolean; data: UserAddress }>(`/user/addresses/${id}`, payload);
  return response.data.data;
};

export const deleteAddress = async (id: string): Promise<{ _id: string }> => {
  const response = await apiClient.delete<{ success: boolean; data: { _id: string } }>(`/user/addresses/${id}`);
  return response.data.data;
};

/**
 * Utility to convert saved UserAddress into the ShippingAddress format required by Checkout APIs
 */
export function toShippingAddress(address: UserAddress): ShippingAddress {
  return {
    fullName: address.name,
    phone: address.phone,
    line1: address.addressLine,
    district: address.district || address.city,
    city: address.city,
    state: address.state,
    postalCode: address.pincode,
    country: address.country || 'India',
  };
}
