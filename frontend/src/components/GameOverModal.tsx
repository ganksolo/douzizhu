import { motion } from 'framer-motion';
import { Trophy, Frown, RotateCcw, Bomb, Zap, Coins } from 'lucide-react';
import type { GameResult } from '../utils/score';

interface GameOverModalProps {
    winnerName: string;
    isWinner: boolean;
    result: GameResult | null;
    onRestart: () => void;
}

export function GameOverModal({ winnerName, isWinner, result, onRestart }: GameOverModalProps) {
    if (!result) return null;

    const playerScore = result.scores['player-0'] || 0;
    const isPositive = playerScore > 0;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-hidden">
            {/* Background Effects */}
            {isWinner ? (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ y: -100, x: Math.random() * window.innerWidth, opacity: 1 }}
                            animate={{ y: window.innerHeight + 100, rotate: 360 }}
                            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                            className="absolute text-yellow-400"
                        >
                            <Coins size={24} />
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="absolute inset-0 pointer-events-none bg-gray-900/50">
                    {[...Array(50)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ y: -20, x: Math.random() * window.innerWidth, opacity: 0.5 }}
                            animate={{ y: window.innerHeight, opacity: 0 }}
                            transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, ease: "linear", delay: Math.random() }}
                            className="absolute w-0.5 h-4 bg-blue-400/30"
                        />
                    ))}
                </div>
            )}

            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className={`relative bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border-4 ${isWinner ? 'border-yellow-400' : 'border-gray-400'}`}
            >
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex justify-center mb-4"
                >
                    {isWinner ? (
                        <div className="p-4 bg-yellow-100 rounded-full ring-4 ring-yellow-200">
                            <Trophy className="w-16 h-16 text-yellow-500" />
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-100 rounded-full ring-4 ring-gray-200">
                            <Frown className="w-16 h-16 text-gray-500" />
                        </div>
                    )}
                </motion.div>

                <h2 className={`text-5xl font-black mb-2 ${isWinner ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500' : 'text-gray-700'}`}>
                    {isWinner ? 'VICTORY!' : 'DEFEAT'}
                </h2>

                <div className="mb-6">
                    <p className="text-gray-500 text-lg">
                        Winner: <span className="font-bold text-black">{winnerName}</span>
                    </p>
                    <div className={`text-4xl font-bold mt-2 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{playerScore}
                    </div>
                </div>

                {/* Score Details */}
                <div className="bg-gray-50 rounded-xl p-4 mb-8 text-sm">
                    <div className="grid grid-cols-2 gap-y-2 text-gray-600">
                        <div className="text-left">Base Score:</div>
                        <div className="text-right font-bold">{result.baseScore}</div>

                        {result.bombCount > 0 && (
                            <>
                                <div className="text-left flex items-center gap-1"><Bomb size={14} /> Bombs ({result.bombCount}):</div>
                                <div className="text-right font-bold text-orange-500">x{Math.pow(2, result.bombCount)}</div>
                            </>
                        )}

                        {(result.isSpring || result.isAntiSpring) && (
                            <>
                                <div className="text-left flex items-center gap-1"><Zap size={14} /> Spring:</div>
                                <div className="text-right font-bold text-purple-500">x2</div>
                            </>
                        )}

                        <div className="col-span-2 border-t border-gray-200 my-1"></div>

                        <div className="text-left font-bold text-black">Total Multiplier:</div>
                        <div className="text-right font-bold text-black text-lg">x{result.multiplier}</div>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRestart}
                    className={`w-full py-4 text-white rounded-xl font-bold text-xl shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2 ${isWinner ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-gray-600 to-gray-500'}`}
                >
                    <RotateCcw className="w-5 h-5" />
                    Play Again
                </motion.button>
            </motion.div>
        </div>
    );
}
