import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye } from 'lucide-react';
import type { Player } from '../types';
import { Card } from './Card';
import { evaluateHand, type AIReason } from '../utils/ai';

interface DebugOverlayProps {
    players: Player[];
    aiReasons: Record<string, { reason: AIReason; timestamp: number }>;
}

export function DebugOverlay({ players, aiReasons }: DebugOverlayProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                setIsVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed top-4 left-4 z-50 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
                title="Open Debug Overlay (Ctrl+D / Cmd+D)"
            >
                <Eye className="w-5 h-5" />
            </button>
        );
    }

    const aiPlayers = players.filter(p => p.isAI);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="fixed top-4 left-4 z-50 bg-black/90 text-white rounded-xl shadow-2xl p-4 max-w-md max-h-[80vh] overflow-y-auto backdrop-blur-md"
            >
                <div className="flex items-center justify-between mb-4 border-b border-white/20 pb-2">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Debug Overlay
                    </h2>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1 rounded hover:bg-white/20 transition-colors"
                        title="Close (Ctrl+D / Cmd+D)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {aiPlayers.map((player) => {
                        const score = evaluateHand(player.hand);
                        const lastReason = aiReasons[player.id];

                        return (
                            <div key={player.id} className="border border-white/20 rounded-lg p-3 bg-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <span className="font-bold text-yellow-400">{player.name}</span>
                                        <span className="ml-2 text-xs text-gray-400">
                                            ({player.role === 'landlord' ? '👑 Landlord' : '👥 Peasant'})
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-400">Score: </span>
                                        <span className={`font-bold ${score >= 70 ? 'text-green-400' :
                                            score >= 40 ? 'text-yellow-400' :
                                                'text-red-400'
                                            }`}>
                                            {score.toFixed(0)}
                                        </span>
                                    </div>
                                </div>

                                {lastReason && (
                                    <div className="mb-2 text-xs">
                                        <span className="text-gray-400">Last Action: </span>
                                        <span className={`px-2 py-0.5 rounded ${lastReason.reason === 'BLOCK_LANDLORD' ? 'bg-red-500/30 text-red-200' :
                                            lastReason.reason === 'HELP_TEAMMATE' ? 'bg-blue-500/30 text-blue-200' :
                                                lastReason.reason === 'ENDGAME_DUMP' ? 'bg-purple-500/30 text-purple-200' :
                                                    lastReason.reason === 'BOMB_PRESERVE' ? 'bg-yellow-500/30 text-yellow-200' :
                                                        'bg-gray-500/30 text-gray-200'
                                            }`}>
                                            {lastReason.reason.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-1">
                                    {player.hand.map((card) => (
                                        <div key={card.id} className="transform scale-50 origin-top-left">
                                            <Card card={card} small />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    {player.hand.length} cards
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center border-t border-white/20 pt-2">
                    Press <kbd className="px-1 bg-white/20 rounded">Ctrl+D</kbd> or <kbd className="px-1 bg-white/20 rounded">Cmd+D</kbd> to toggle
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
