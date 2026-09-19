import { ShieldCheck, Building2, Users } from 'lucide-react';

/**
 * Centralized Demo Role Accounts Configuration
 * Reads credentials strictly from environment variables.
 */
export const demoAccounts = {
  SUPER_ADMIN: {
    key: 'SUPER_ADMIN',
    label: 'Super Admin',
    badge: 'Platform Level',
    icon: ShieldCheck,
    email: import.meta.env.VITE_DEMO_SUPER_ADMIN_EMAIL || '',
    password: import.meta.env.VITE_DEMO_SUPER_ADMIN_PASSWORD || '',
    description: 'Manage clubs, platform-wide events and administration.',
    buttonText: 'Continue as Super Admin'
  },

  CLUB_ADMIN: {
    key: 'CLUB_ADMIN',
    label: 'Club Admin',
    badge: 'Club Operations',
    icon: Building2,
    email: import.meta.env.VITE_DEMO_CLUB_ADMIN_EMAIL || '',
    password: import.meta.env.VITE_DEMO_CLUB_ADMIN_PASSWORD || '',
    description: 'Manage your club, events, volunteers and operations.',
    buttonText: 'Continue as Club Admin'
  },

  VOLUNTEER: {
    key: 'VOLUNTEER',
    label: 'Volunteer',
    badge: 'Event Roster',
    icon: Users,
    email: import.meta.env.VITE_DEMO_VOLUNTEER_EMAIL || '',
    password: import.meta.env.VITE_DEMO_VOLUNTEER_PASSWORD || '',
    description: 'View assigned tasks, event information and club knowledge.',
    buttonText: 'Continue as Volunteer'
  }
};

/**
 * Check if a specific demo account has configured credentials
 * @param {string} roleKey 
 * @returns {boolean}
 */
export const isDemoConfigured = (roleKey) => {
  const account = demoAccounts[roleKey];
  return Boolean(
    account &&
    typeof account.email === 'string' &&
    account.email.trim().length > 0 &&
    typeof account.password === 'string' &&
    account.password.trim().length > 0
  );
};
