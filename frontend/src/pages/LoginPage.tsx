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
            navigate('/lobby'); // Redirect to lobby instead of room
        } catch (err) {
            setLocalError('Login failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500">
            <div className="w-full max-w-md px-6">
                {/* Logo/Title Card */}
                <div className="text-center mb-8">
                    <div className="inline-block bg-white rounded-2xl p-6 mb-6">
                        <div className="text-6xl mb-2">🃏</div>
                        <h1 className="text-3xl font-bold text-gray-800">Dou Dizhu</h1>
                    </div>
                    <p className="text-white text-lg opacity-90">斗地主 · 欢迎来战</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl p-8 space-y-6">
                    {(error || localError) && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                            <p className="text-red-700 text-sm">{error || localError}</p>
                        </div>
                    )}

                    <button
                        onClick={handleGuestLogin}
                        disabled={isLoading}
                        className={`
                            w-full h-14 rounded-xl font-semibold text-lg
                            transition-all duration-200
                            ${isLoading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                            }
                        `}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                登录中...
                            </span>
                        ) : (
                            '快速开始游戏'
                        )}
                    </button>

                    <div className="text-center space-y-2">
                        <p className="text-sm text-gray-500">无需注册，点击即玩</p>
                        <p className="text-xs text-gray-400">系统将自动为您分配游客身份</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-white text-sm opacity-75">
                    <p>支持3人对战 · 经典斗地主规则</p>
                </div>
            </div>
        </div>
    );
};
