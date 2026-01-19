/**
 * Toast Module
 *
 * Kawaii-themed toast notifications.
 *
 * Usage:
 *   // In layout.tsx - add the Toaster component
 *   import { Toaster } from '@/components/ui/Toast';
 *   <Toaster />
 *
 *   // Anywhere in the app - show toasts
 *   import { toast } from '@/components/ui/Toast';
 *   toast.success('Operation completed!');
 *   toast.error('Something went wrong');
 *   toast.warning('Please check your input');
 *   toast.info('Did you know?');
 *   toast.loading('Processing...');
 *
 *   // Promise handling
 *   toast.promise(fetchData(), {
 *     loading: 'Loading...',
 *     success: 'Data loaded!',
 *     error: 'Failed to load',
 *   });
 */

export { Toaster } from "./Toaster";
export { toast } from "./toast";
