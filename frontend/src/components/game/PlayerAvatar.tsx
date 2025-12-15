import { motion } from 'framer-motion';

interface PlayerAvatarProps {
    username: string;
    avatar?: string;
    isTurn?: boolean;
    handCount?: number;
    position: 'bottom' | 'top' | 'left' | 'right';
    isBot?: boolean;
    isLandlord?: boolean;
    lastBid?: number | null;  // 上次叫分结果：null=未叫, 0=Pass, 1-3=叫分
    coins?: number;           // 金币数量
    isThinking?: boolean;     // 是否在 "Thinking..." 状态
}

export const PlayerAvatar = ({
    username,
    avatar,
    isTurn,
    handCount,
    position,
    isBot,
    isLandlord,
    lastBid,
    coins = 0,
    isThinking = false,
}: PlayerAvatarProps) => {
    const avatarUrl = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    // 格式化金币显示
    const formatCoins = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}m`;
        if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
        return n.toString();
    };

    // 根据位置决定布局方向
    const isHorizontal = position === 'left' || position === 'right';
    const flexDirection = position === 'right' ? 'flex-row-reverse' : position === 'left' ? 'flex-row' : 'flex-col';

    return (
        <div className={`flex items-center relative gap-3 ${flexDirection}`}>
            {/* --- 玩家头像区域 --- */}
            <div className="relative">
                {/* 金色呼吸边框 - 轮到时 */}
                {isTurn && (
                    <motion.div
                        className="absolute -inset-1 rounded-full"
                        style={{
                            border: '3px solid #d4af37',
                            boxShadow: '0 0 12px rgba(212, 175, 55, 0.6)',
                        }}
                        animate={{
                            opacity: [0.6, 1, 0.6],
                            scale: [1, 1.03, 1],
                            boxShadow: [
                                '0 0 8px rgba(212, 175, 55, 0.4)',
                                '0 0 16px rgba(212, 175, 55, 0.8)',
                                '0 0 8px rgba(212, 175, 55, 0.4)',
                            ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                )}

                {/* 头像主体 */}
                <div
                    className="w-14 h-14 rounded-full overflow-hidden z-10 relative"
                    style={{
                        border: isTurn ? '2px solid #d4af37' : '2px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    }}
                >
                    <img
                        src={avatarUrl}
                        alt={username}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* 手牌数量徽章 - 红色圆形 (非底部玩家) */}
                {handCount !== undefined && position !== 'bottom' && (
                    <div
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center z-20"
                        style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                            border: '2px solid #fecaca',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        }}
                    >
                        <span className="text-white text-xs font-bold">{handCount}</span>
                    </div>
                )}

                {/* 地主标记 */}
                {isLandlord && (
                    <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 z-30"
                        style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}
                    >
                        <span className="text-xl">👑</span>
                    </div>
                )}

                {/* AI 徽章 */}
                {isBot && (
                    <span
                        className="absolute -bottom-1 -right-1 text-white text-[9px] px-1.5 py-0.5 rounded-full z-20 font-bold"
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            border: '1px solid rgba(255,255,255,0.5)',
                        }}
                    >
                        AI
                    </span>
                )}
            </div>

            {/* --- 信息面板 + 叫分气泡 --- */}
            <div className="flex flex-col items-center gap-1">
                {/* Thinking 状态 或 叫分气泡 */}
                {isThinking ? (
                    <motion.div
                        className="px-3 py-1 rounded-lg text-xs font-medium"
                        style={{
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                        }}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        Thinking...
                    </motion.div>
                ) : lastBid !== undefined && lastBid !== null && (
                    <div
                        className="px-3 py-1 rounded-lg text-xs font-bold"
                        style={{
                            background: lastBid === 0
                                ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            border: lastBid === 0
                                ? '1px solid rgba(255,255,255,0.2)'
                                : '1px solid rgba(255,255,255,0.4)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        }}
                    >
                        {lastBid === 0 ? 'Pass' : `${lastBid} Point${lastBid > 1 ? 's' : ''}`}
                    </div>
                )}

                {/* 用户名 */}
                <div
                    className="px-2 py-0.5 rounded text-xs font-bold truncate max-w-[80px]"
                    style={{
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                    }}
                >
                    {username}
                </div>

                {/* 金币显示 */}
                <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                    style={{
                        background: 'rgba(0,0,0,0.5)',
                        color: '#fbbf24',
                    }}
                >
                    <span>💰</span>
                    <span className="font-medium">{formatCoins(coins)}</span>
                </div>
            </div>

            {/* --- 对手手牌展示 (水平扇形，仅 left/right) --- */}
            {handCount !== undefined && handCount > 0 && position !== 'bottom' && isHorizontal && (
                <div
                    className="flex items-center"
                    style={{
                        marginLeft: position === 'left' ? '8px' : '0',
                        marginRight: position === 'right' ? '8px' : '0',
                    }}
                >
                    <div className="flex -space-x-4">
                        {Array(Math.min(handCount, 8)).fill(0).map((_, i) => (
                            <div
                                key={i}
                                className="w-8 h-12 rounded"
                                style={{
                                    background: 'linear-gradient(135deg, #8b1a1a 0%, #5c1010 100%)',
                                    border: '1px solid #d4a574',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    transform: `rotate(${(i - Math.min(handCount, 8) / 2) * 3}deg)`,
                                }}
                            >
                                {/* 菱形纹路 */}
                                <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{
                                        backgroundImage: `
                                            linear-gradient(45deg, transparent 40%, rgba(212, 165, 116, 0.3) 50%, transparent 60%),
                                            linear-gradient(-45deg, transparent 40%, rgba(212, 165, 116, 0.3) 50%, transparent 60%)
                                        `,
                                        backgroundSize: '8px 8px',
                                    }}
                                >
                                    <div
                                        className="w-4 h-4 rotate-45"
                                        style={{
                                            border: '1px solid rgba(212, 165, 116, 0.5)',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- 对手手牌展示 (仅 top 位置，显示在头像下方) --- */}
            {handCount !== undefined && handCount > 0 && position === 'top' && (
                <div className="flex -space-x-4 mt-2">
                    {Array(Math.min(handCount, 10)).fill(0).map((_, i) => (
                        <div
                            key={i}
                            className="w-8 h-12 rounded"
                            style={{
                                background: 'linear-gradient(135deg, #8b1a1a 0%, #5c1010 100%)',
                                border: '1px solid #d4a574',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                transform: `rotate(${(i - Math.min(handCount, 10) / 2) * 2}deg)`,
                            }}
                        >
                            {/* 菱形纹路 */}
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{
                                    backgroundImage: `
                                        linear-gradient(45deg, transparent 40%, rgba(212, 165, 116, 0.3) 50%, transparent 60%),
                                        linear-gradient(-45deg, transparent 40%, rgba(212, 165, 116, 0.3) 50%, transparent 60%)
                                    `,
                                    backgroundSize: '8px 8px',
                                }}
                            >
                                <div
                                    className="w-4 h-4 rotate-45"
                                    style={{
                                        border: '1px solid rgba(212, 165, 116, 0.5)',
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
