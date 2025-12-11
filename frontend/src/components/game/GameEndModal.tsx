import { motion } from 'framer-motion';
import { Trophy, Crown, Users, RotateCcw, LogOut } from 'lucide-react';

interface GameEndModalProps {
    winnerId: string;
    isLandlordWin: boolean;
    multiplier: number;
    mySeatId: number | null;
    landlordSeatIndex: number | null;
    onPlayAgain: () => void;
    onExit: () => void;
}

export const GameEndModal = ({
    winnerId,
    isLandlordWin,
    multiplier,
    mySeatId,
    landlordSeatIndex,
    onPlayAgain,
    onExit,
}: GameEndModalProps) => {
    // 判断当前玩家是否是地主
    const amILandlord = mySeatId === landlordSeatIndex;
    // 判断当前玩家是否获胜
    const didIWin = amILandlord === isLandlordWin;

    return (
        <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-700 max-w-md w-full mx-4"
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20 }}
            >
                {/* Winner Icon */}
                <div className="flex justify-center mb-6">
                    {didIWin ? (
                        <motion.div
                            className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Trophy size={48} className="text-white" />
                        </motion.div>
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-lg">
                            <Users size={48} className="text-gray-400" />
                        </div>
                    )}
                </div>

                {/* Result Title */}
                <h2 className={`text-3xl font-bold text-center mb-4 ${didIWin ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {didIWin ? '🎉 胜利！' : '😢 失败'}
                </h2>

                {/* Winner Info */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        {isLandlordWin ? (
                            <>
                                <Crown className="text-yellow-500" size={20} />
                                <span className="text-white text-lg">地主获胜</span>
                            </>
                        ) : (
                            <>
                                <Users className="text-blue-400" size={20} />
                                <span className="text-white text-lg">农民获胜</span>
                            </>
                        )}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">
                        获胜者: <span className="text-white font-medium">{winnerId}</span>
                    </div>
                    <div className="text-gray-400 text-sm">
                        倍率: <span className="text-yellow-400 font-bold">x{multiplier}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <motion.button
                        onClick={onPlayAgain}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:from-green-400 hover:to-green-500 transition-all"
                    >
                        <RotateCcw size={20} />
                        再来一局
                    </motion.button>
                    <motion.button
                        onClick={onExit}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:from-gray-500 hover:to-gray-600 transition-all"
                    >
                        <LogOut size={20} />
                        退出房间
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};
