import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export const LoginPage = () => {
    const navigate = useNavigate();
    const loginGuest = useAuthStore((state) => state.loginGuest);
    const login = useAuthStore((state) => state.login);
    const isLoading = useAuthStore((state) => state.isLoading);
    const error = useAuthStore((state) => state.error);

    // Local State
    const [loginMode, setLoginMode] = useState<'guest' | 'account'>('guest');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleGuestLogin = async () => {
        try {
            await loginGuest();
            navigate('/lobby');
        } catch (err) {
            // Error handled by store
        }
    };

    const handleAccountLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(username, password);
            navigate('/lobby');
        } catch (err: any) {
            if (err.response?.status === 404) {
                useAuthStore.setState({ error: 'Account does not exist, please register' });
            } else if (err.response?.status === 401) {
                useAuthStore.setState({ error: 'Invalid password' });
            }
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
                <div className="bg-white rounded-2xl p-8 shadow-xl">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            className={`flex-1 pb-3 text-sm font-semibold transition-colors ${loginMode === 'guest'
                                ? 'text-emerald-600 border-b-2 border-emerald-500'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                            onClick={() => setLoginMode('guest')}
                        >
                            Guest Login
                        </button>
                        <button
                            className={`flex-1 pb-3 text-sm font-semibold transition-colors ${loginMode === 'account'
                                ? 'text-emerald-600 border-b-2 border-emerald-500'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                            onClick={() => setLoginMode('account')}
                        >
                            Account Login
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {loginMode === 'guest' ? (
                        <div className="space-y-6">
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
                                        Logging in...
                                    </span>
                                ) : (
                                    'Quick Start (Guest)'
                                )}
                            </button>
                            <div className="text-center space-y-2">
                                <p className="text-sm text-gray-500">No registration required.</p>
                                <p className="text-xs text-gray-400">System will assign a temporary ID.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleAccountLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                    placeholder="Enter username"
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                    placeholder="Enter password"
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`
                                    w-full h-12 rounded-xl font-semibold text-lg mt-2
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
                                        Logging in...
                                    </span>
                                ) : (
                                    'Login'
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <p className="text-sm text-gray-500">
                                    Don't have an account?{' '}
                                    <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
                                        Register here
                                    </Link>
                                </p>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-white text-sm opacity-75">
                    <p>Supports 4-Player • Classic Rules</p>
                </div>
            </div>
        </div>
    );
};
