import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../components/ui/useToast';

export const RegisterPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const register = useAuthStore((state) => state.register);
    const isLoading = useAuthStore((state) => state.isLoading);
    const error = useAuthStore((state) => state.error);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Local Validation
        if (password !== confirmPassword) {
            toast({
                title: 'Validation Error',
                message: 'Passwords do not match',
                type: 'error'
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: 'Validation Error',
                message: 'Password must be at least 6 characters',
                type: 'error'
            });
            return;
        }

        try {
            await register(username, password);
            toast({
                title: 'Registration Successful',
                message: 'Please login with your new account',
                type: 'success'
            });
            // Delay navigation to allow toast to be seen
            setTimeout(() => {
                navigate('/login');
            }, 1000);
        } catch (err: any) {
            console.error('Registration failed', err);
            if (err.response?.status === 409) {
                toast({
                    title: 'Registration Failed',
                    message: 'Username already exists',
                    type: 'error'
                });
            } else {
                toast({
                    title: 'Registration Failed',
                    message: err.message || 'An error occurred during registration',
                    type: 'error'
                });
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500">
            <div className="w-full max-w-md px-6">
                <div className="bg-white rounded-2xl p-8 space-y-6 shadow-xl">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
                        <p className="text-gray-500 mt-1">Join the Dou Dizhu community</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                required
                                minLength={3}
                                maxLength={20}
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
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                placeholder="Min 6 characters"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                placeholder="Confirm password"
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`
                                w-full h-12 rounded-xl font-semibold text-lg mt-6
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
                                    Creating Account...
                                </span>
                            ) : (
                                'Register'
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-2">
                        <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
                                Login here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
