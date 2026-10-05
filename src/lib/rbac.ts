import { UserRole } from '../types';

export const ROLE_ALLOWED_SCREENS: Record<UserRole, number[]> = {
  farmer: [1, 2, 3, 4, 5, 6],
  fpo_admin: [1, 2, 3, 4, 5, 6],
  bulk_buyer: [7, 8, 9, 10, 11],
  consumer_group: [7, 8, 9, 10, 11],
  transporter: [12, 13, 14],
  doca_admin: [15],
};

export const ROLE_DEFAULT_SCREEN: Record<UserRole, number> = {
  farmer: 1,
  fpo_admin: 1,
  bulk_buyer: 7,
  consumer_group: 7,
  transporter: 12,
  doca_admin: 15,
};
