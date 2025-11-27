import { motion } from 'framer-motion';
import { Trophy, Frown, RotateCcw } from 'lucide-react';

interface GameOverModalProps {
    winnerName: string;
    isWinner: boolean;
    onRestart: () => void;
}

export function GameOverModal({ winnerName, isWinner, onRestart }: GameOverModalProps) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-yellow-400"
            >
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex justify-center mb-6"
                >
                    {isWinner ? (
                        <div className="p-4 bg-yellow-100 rounded-full">
                            <Trophy className="w-16 h-16 text-yellow-500" />
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-100 rounded-full">
                            <Frown className="w-16 h-16 text-gray-500" />
                        </div>
                    )}
                </motion.div>

                <h2 className={`text-4xl font-black mb-2 ${isWinner ? 'text-yellow-600' : 'text-gray-700'}`}>
                    {isWinner ? 'VICTORY!' : 'DEFEAT'}
                </h2>

                <p className="text-gray-500 mb-8 text-lg">
                    Winner: <span className="font-bold text-black">{winnerName}</span>
                </p>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRestart}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-xl shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2"
                >
                    <RotateCcw className="w-5 h-5" />
                    Play Again
                </motion.button>
            </motion.div>
        </div>
    );
}
