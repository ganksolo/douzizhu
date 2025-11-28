import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [idCounter, setIdCounter] = useState(0);

    const show = useCallback((message: string, type: ToastType = 'info') => {
        const id = idCounter;
        setIdCounter(prev => prev + 1);
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 2 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 2000);
    }, [idCounter]);

    const getToastStyles = (type: ToastType) => {
        const baseStyles = 'px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm font-semibold text-white';
        switch (type) {
            case 'success': return `${baseStyles} bg-green-600/90`;
            case 'error': return `${baseStyles} bg-red-600/90`;
            case 'warning': return `${baseStyles} bg-yellow-600/90`;
            default: return `${baseStyles} bg-black/80`;
        }
    };

    return (
        <ToastContext.Provider value={{ show }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className={getToastStyles(toast.type)}
                        >
                            {toast.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
