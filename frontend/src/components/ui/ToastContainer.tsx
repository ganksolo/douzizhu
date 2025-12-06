import { useToastStore } from '../../store/toast.store';

export const ToastContainer = () => {
    const toasts = useToastStore((state) => state.toasts);
    const removeToast = useToastStore((state) => state.removeToast);

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto min-w-[300px] max-w-md p-4 rounded-lg shadow-lg 
                        transform transition-all duration-300 animate-in slide-in-from-right
                        ${toast.type === 'success' ? 'bg-white border-l-4 border-emerald-500' :
                            toast.type === 'error' ? 'bg-white border-l-4 border-red-500' :
                                'bg-white border-l-4 border-blue-500'
                        }
                    `}
                    role="alert"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            {toast.title && (
                                <h3 className={`font-semibold mb-1 ${toast.type === 'success' ? 'text-emerald-700' :
                                        toast.type === 'error' ? 'text-red-700' :
                                            'text-blue-700'
                                    }`}>
                                    {toast.title}
                                </h3>
                            )}
                            <p className="text-gray-600 text-sm">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
