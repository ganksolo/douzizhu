import { useCallback } from 'react';
import { useToastStore } from '../../store/toast.store';

interface ToastOptions {
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
}

export const useToast = () => {
    const addToast = useToastStore((state) => state.addToast);

    const toast = useCallback(({ title, message, type = 'info', duration = 3000 }: ToastOptions) => {
        addToast({ title, message, type, duration });
    }, [addToast]);

    return { toast };
};
