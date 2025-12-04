import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export const LoginPage = () => {
    const navigate = useNavigate();
    const loginGuest = useAuthStore((state) => state.loginGuest);
    const isLoading = useAuthStore((state) => state.isLoading);
    const error = useAuthStore((state) => state.error);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleGuestLogin = async () => {
        setLocalError(null);
        try {
            await loginGuest();
            navigate('/room/1'); // Default debug room
        } catch (err) {
            setLocalError('Login failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Dou Dizhu</h1>

                {(error || localError) && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error || localError}
                    </div>
                )}

                <button
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                    className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {isLoading ? 'Logging in...' : 'Guest Login'}
                </button>
            </div>
        </div>
    );
};
