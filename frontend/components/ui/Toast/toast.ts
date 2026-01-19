/**
 * Toast Utility Functions
 *
 * Kawaii-themed toast notifications using Sonner.
 * Import and use these functions anywhere in the app.
 *
 * Usage:
 *   import { toast } from '@/components/ui/Toast';
 *   toast.success('Prize redeemed!');
 *   toast.error('Something went wrong');
 */

import { toast as sonnerToast, type ExternalToast } from "sonner";

type ToastOptions = Omit<ExternalToast, "id"> & {
  id?: string | number;
};

/**
 * Show a success toast
 */
function success(message: string, options?: ToastOptions) {
  return sonnerToast.success(message, {
    ...options,
  });
}

/**
 * Show an error toast
 */
function error(message: string, options?: ToastOptions) {
  return sonnerToast.error(message, {
    duration: 5000, // Errors stay longer
    ...options,
  });
}

/**
 * Show a warning toast
 */
function warning(message: string, options?: ToastOptions) {
  return sonnerToast.warning(message, {
    duration: 4000,
    ...options,
  });
}

/**
 * Show an info toast
 */
function info(message: string, options?: ToastOptions) {
  return sonnerToast.info(message, {
    ...options,
  });
}

/**
 * Show a loading toast (returns ID for dismissal)
 */
function loading(message: string, options?: ToastOptions) {
  return sonnerToast.loading(message, {
    ...options,
  });
}

/**
 * Dismiss a toast by ID
 */
function dismiss(id?: string | number) {
  sonnerToast.dismiss(id);
}

/**
 * Show a promise toast (loading → success/error)
 */
function promise<T>(
  promise: Promise<T>,
  {
    loading: loadingMsg,
    success: successMsg,
    error: errorMsg,
    ...options
  }: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  } & ToastOptions
) {
  return sonnerToast.promise(promise, {
    loading: loadingMsg,
    success: successMsg,
    error: errorMsg,
    ...options,
  });
}

/**
 * Custom toast with full control
 */
function custom(message: string, options?: ToastOptions) {
  return sonnerToast(message, options);
}

export const toast = {
  success,
  error,
  warning,
  info,
  loading,
  dismiss,
  promise,
  custom,
  // Re-export raw sonner toast for advanced use cases
  raw: sonnerToast,
};
