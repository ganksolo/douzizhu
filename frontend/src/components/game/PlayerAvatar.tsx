import { motion } from 'framer-motion';

interface PlayerAvatarProps {
    username: string;
    avatar?: string; // ✅ Issue #20: Add avatar prop
    isTurn?: boolean;
    handCount?: number;
    position: 'bottom' | 'top' | 'left' | 'right';
    isBot?: boolean;
}

export const PlayerAvatar = ({ username, avatar, isTurn, handCount, position, isBot }: PlayerAvatarProps) => {
    // Use provided avatar or fallback to dicebear generated avatar
    const avatarUrl = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    return (
        <div className={`flex flex-col items-center relative gap-2 ${position === 'right' ? 'flex-row-reverse' : position === 'left' ? 'flex-row' : ''}`}>
            {/* Avatar Circle */}
            <div className="relative">
                {/* Breathing Ring */}
                {isTurn && (
                    <motion.div
                        className="absolute -inset-2 rounded-full border-4 border-yellow-400"
                        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                )}

                {/* Timer/Progress Ring (Placeholder) */}
                {isTurn && <div className="absolute -inset-1 rounded-full border-2 border-yellow-200 opacity-50"></div>}

                <div className={`
                    w-16 h-16 rounded-full bg-gray-200 border-2 overflow-hidden z-10 relative
                    ${isTurn ? 'border-yellow-400' : 'border-white'}
                `}>
                    <img
                        src={avatarUrl}
                        alt={username}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Role/Bot Badge */}
                {isBot && (
                    <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-white z-20">
                        AI
                    </span>
                )}
            </div>

            {/* Info Box */}
            <div className="flex flex-col items-center bg-black/60 px-3 py-1 rounded-lg backdrop-blur-sm min-w-[80px]">
                <span className="text-white text-xs font-bold truncate max-w-[80px]">{username}</span>
                <span className="text-yellow-400 text-xs">💰 1000</span>
            </div>

            {/* Hand Count (Side/Top Layout) */}
            {handCount !== undefined && position !== 'bottom' && (
                <div className="flex flex-col items-center bg-blue-900/80 px-2 py-1 rounded border border-blue-500/50">
                    <div className="w-4 h-6 bg-blue-700 border border-blue-300 rounded-sm mb-0.5"></div>
                    <span className="text-white text-xs font-bold">{handCount}</span>
                </div>
            )}
        </div>
    );
};
