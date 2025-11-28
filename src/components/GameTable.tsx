import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Crown, Settings } from 'lucide-react';
import type { Card as CardType } from '../types';
import { useGameLoop } from '../hooks/useGameLoop';
import { Card } from './Card';
import { PlayerHand } from './PlayerHand';
import { GameOverModal } from './GameOverModal';
import { getHint } from '../utils/ai';
import { soundManager } from '../utils/sound';
import { themes, type Theme } from '../utils/theme';
import { useToast } from '../contexts/ToastContext';
import { SoundToggle } from './SoundToggle';
import { DebugOverlay } from './DebugOverlay';
import type { AIReason } from '../utils/ai';
import { Bot, BotOff } from 'lucide-react';

export function GameTable() {
    const toast = useToast();
    const [aiReasons] = useState<Record<string, { reason: AIReason; timestamp: number }>>({});

    const {
        phase,
        players,
        bottomCards,
        currentTurn,
        landlordId,
        lastPlayedCards,
        winnerId,
        cardsDealt,
        isShuffling,
        gameResult,
        startGame,
        handleBid,
        handlePlay,
        handlePass,
        setPlayers,
    } = useGameLoop((message, type) => toast.show(message, type || 'error'));

    const [currentTheme, setCurrentTheme] = useState<Theme>('classic');
    const [showSettings, setShowSettings] = useState(false);

    const toggleTheme = (theme: Theme) => {
        setCurrentTheme(theme);
        const t = themes[theme];
        document.documentElement.style.setProperty('--table-bg', t.bg);
        document.documentElement.style.setProperty('--accent-color', t.accent);
        document.documentElement.style.setProperty('--text-color', t.text);
    };

    // Initialize theme
    useEffect(() => {
        toggleTheme('classic');
    }, []);

    useEffect(() => {
        startGame();
    }, []);

    // Initialize sound on mount (after user has loaded page)
    useEffect(() => {
        // Initialize sound manager after a short delay to ensure user interaction
        const initSound = async () => {
            await soundManager.initialize();
        };
        // Delay to allow for user interaction
        const timer = setTimeout(initSound, 500);
        return () => clearTimeout(timer);
    }, []);

    // Sound Effects
    useEffect(() => {
        if (isShuffling) {
            soundManager.play('shuffle');
        }
    }, [isShuffling]);

    useEffect(() => {
        if (phase === 'DEALING') {
            soundManager.play('deal');
        }
    }, [cardsDealt, phase]);

    const handleCardClick = (clickedCard: CardType) => {
        if (currentTurn !== 0 || phase !== 'PLAYING') return;

        setPlayers((prevPlayers) => {
            const newPlayers = [...prevPlayers];
            const humanHand = newPlayers[0].hand.map((card) => {
                if (card.id === clickedCard.id) {
                    return { ...card, isSelected: !card.isSelected };
                }
                return card;
            });
            newPlayers[0] = { ...newPlayers[0], hand: humanHand };
            return newPlayers;
        });
    };

    const resetHandSelection = () => {
        setPlayers((prevPlayers) => {
            const newPlayers = [...prevPlayers];
            const humanHand = newPlayers[0].hand.map((card) => ({ ...card, isSelected: false }));
            newPlayers[0] = { ...newPlayers[0], hand: humanHand };
            return newPlayers;
        });
    };

    const handleSelectionChange = (selectedCardIds: string[], _isAdditive: boolean = false) => {
        if (currentTurn !== 0 || phase !== 'PLAYING') return;

        setPlayers((prevPlayers) => {
            const newPlayers = [...prevPlayers];
            const humanHand = newPlayers[0].hand.map((card) => {
                // If not additive (new selection), deselect others. 
                // Let's make it simple: The passed IDs become selected.
                return { ...card, isSelected: selectedCardIds.includes(card.id) };
            });
            newPlayers[0] = { ...newPlayers[0], hand: humanHand };
            return newPlayers;
        });
    };

    const onPlayClick = () => {
        const selectedCards = players[0].hand.filter((c) => c.isSelected);
        if (selectedCards.length === 0) {
            toast.show('Please select cards to play.', 'warning');
            return;
        }
        handlePlay(selectedCards);
        // Reset selection after play (though hand will change, it's safer)
        // Actually handlePlay updates the hand by removing cards.
        // The remaining cards should naturally be unselected unless we preserved state incorrectly.
        // But let's force reset to be sure.
        resetHandSelection();
    };

    const onHintClick = () => {
        if (!players[0]) return;

        // Reset selection first
        resetHandSelection();

        // Use a timeout to allow state update before applying hint? 
        // No, setState batching might make it tricky.
        // Better: Calculate hint and set selection directly in one go.
        // But resetHandSelection uses setPlayers, and handleSelectionChange uses setPlayers.
        // If we call both, React batches them.
        // Let's just calculate hint and set that as the *only* selection.

        const hint = getHint(players[0].hand, lastPlayedCards ? lastPlayedCards.type : null);
        if (hint) {
            const hintIds = hint.map(c => c.id);
            handleSelectionChange(hintIds, false);
        } else {
            toast.show('No valid move found.', 'info');
        }
    };

    const onPassClick = () => {
        handlePass();
        resetHandSelection();
    };

    const toggleAutoPlay = () => {
        setPlayers((prev) => {
            const newPlayers = [...prev];
            if (newPlayers[0]) {
                newPlayers[0] = {
                    ...newPlayers[0],
                    isAutoPlay: !newPlayers[0].isAutoPlay
                };
                toast.show(
                    newPlayers[0].isAutoPlay ? 'Auto-play enabled' : 'Auto-play disabled',
                    newPlayers[0].isAutoPlay ? 'success' : 'info'
                );
            }
            return newPlayers;
        });
    };

    if (players.length === 0 && !isShuffling) return <div>Loading...</div>;

    const getPlayerIcon = (playerId: string) => {
        if (landlordId === playerId) return <Crown className="text-yellow-400 w-6 h-6" />;
        return <User className="text-gray-300 w-6 h-6" />;
    };

    return (
        <div className="relative w-full h-screen overflow-hidden flex flex-col font-sans" style={{ backgroundImage: 'var(--table-bg)', color: 'var(--text-color)' }}>
            {/* Settings Button */}
            <button
                onClick={() => setShowSettings(!showSettings)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
                <Settings className="w-6 h-6" />
            </button>

            {/* Settings Menu */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-16 right-4 z-50 bg-white rounded-xl shadow-xl p-4 flex flex-col gap-2 min-w-[150px]"
                    >
                        <h3 className="text-black font-bold mb-2">Select Theme</h3>
                        {(Object.keys(themes) as Theme[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => toggleTheme(t)}
                                className={`px-4 py-2 rounded-lg text-left capitalize ${currentTheme === t ? 'bg-blue-100 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-700'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Felt Texture Overlay (Only for classic/wood?) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')] mix-blend-overlay"></div>

            {/* ... rest of the component ... */}

            {/* Shuffling Animation */}
            <AnimatePresence>
                {isShuffling && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                            className="w-24 h-36 bg-blue-800 rounded-lg border-4 border-white shadow-2xl flex items-center justify-center"
                        >
                            <div className="text-white font-bold">Shuffling...</div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Player (AI 2) */}
            <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-300 ${currentTurn === 2 ? 'scale-110' : 'scale-100'}`}>
                {players[2] && (
                    <>
                        <div className={`flex items-center gap-2 mb-2 px-4 py-1 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-300 ${currentTurn === 2 ? 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''}`}>
                            {getPlayerIcon(players[2].id)}
                            <span className="text-white font-bold">AI 2</span>
                            {currentTurn === 2 && <span className="text-yellow-400 text-sm animate-pulse">(Thinking...)</span>}
                        </div>
                        <PlayerHand cards={phase === 'DEALING' ? players[2].hand.slice(0, cardsDealt) : players[2].hand} />
                    </>
                )}
            </div>

            {/* Left Player (AI 3) */}
            <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center z-10 transition-all duration-300 ${currentTurn === 3 ? 'scale-110' : 'scale-100'}`}>
                {players[3] && (
                    <>
                        <div className={`flex items-center gap-2 mb-2 px-4 py-1 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-300 ${currentTurn === 3 ? 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''}`}>
                            {getPlayerIcon(players[3].id)}
                            <span className="text-white font-bold">AI 3</span>
                            {currentTurn === 3 && <span className="text-yellow-400 text-sm animate-pulse">...</span>}
                        </div>
                        <PlayerHand cards={phase === 'DEALING' ? players[3].hand.slice(0, cardsDealt) : players[3].hand} className="rotate-90" />
                    </>
                )}
            </div>

            {/* Right Player (AI 1) */}
            <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center z-10 transition-all duration-300 ${currentTurn === 1 ? 'scale-110' : 'scale-100'}`}>
                {players[1] && (
                    <>
                        <div className={`flex items-center gap-2 mb-2 px-4 py-1 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-300 ${currentTurn === 1 ? 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''}`}>
                            {getPlayerIcon(players[1].id)}
                            <span className="text-white font-bold">AI 1</span>
                            {currentTurn === 1 && <span className="text-yellow-400 text-sm animate-pulse">...</span>}
                        </div>
                        <PlayerHand cards={phase === 'DEALING' ? players[1].hand.slice(0, cardsDealt) : players[1].hand} className="-rotate-90" />
                    </>
                )}
            </div>

            {/* Center Area - Bottom Cards Only */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-8 z-10">
                {/* Bottom Cards */}
                <div className="flex gap-2 p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-xl">
                    {bottomCards.length > 0 ? (
                        bottomCards.map(card => <Card key={card.id} card={card} small={phase !== 'GAME_OVER'} isBack={phase === 'BIDDING' || phase === 'DEALING'} />)
                    ) : (
                        <div className="text-white/50 text-sm font-medium">Bottom Cards</div>
                    )}
                </div>
            </div>

            {/* Play Area - Bottom (Player 0 - User) */}
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-10">
                <AnimatePresence mode="wait">
                    {lastPlayedCards && lastPlayedCards.playerId === players[0]?.id ? (
                        <motion.div
                            key={lastPlayedCards.playerId}
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: -20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="flex -space-x-8"
                        >
                            {lastPlayedCards.cards.map(card => <Card key={card.id} card={card} />)}
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Play Area - Right (Player 1 - AI 1) */}
            <div className="absolute right-32 top-1/2 transform -translate-y-1/2 z-10">
                <AnimatePresence mode="wait">
                    {lastPlayedCards && lastPlayedCards.playerId === players[1]?.id ? (
                        <motion.div
                            key={lastPlayedCards.playerId}
                            initial={{ scale: 0.8, opacity: 0, x: 20 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            exit={{ scale: 0.8, opacity: 0, x: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="flex -space-x-6"
                        >
                            {lastPlayedCards.cards.map(card => <Card key={card.id} card={card} small />)}
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Play Area - Top (Player 2 - AI 2) */}
            <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-10">
                <AnimatePresence mode="wait">
                    {lastPlayedCards && lastPlayedCards.playerId === players[2]?.id ? (
                        <motion.div
                            key={lastPlayedCards.playerId}
                            initial={{ scale: 0.8, opacity: 0, y: -20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="flex -space-x-6"
                        >
                            {lastPlayedCards.cards.map(card => <Card key={card.id} card={card} small />)}
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Play Area - Left (Player 3 - AI 3) */}
            <div className="absolute left-32 top-1/2 transform -translate-y-1/2 z-10">
                <AnimatePresence mode="wait">
                    {lastPlayedCards && lastPlayedCards.playerId === players[3]?.id ? (
                        <motion.div
                            key={lastPlayedCards.playerId}
                            initial={{ scale: 0.8, opacity: 0, x: -20 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            exit={{ scale: 0.8, opacity: 0, x: -20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="flex -space-x-6"
                        >
                            {lastPlayedCards.cards.map(card => <Card key={card.id} card={card} small />)}
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Bottom Player (Human) */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-4xl flex flex-col items-center z-20">
                {/* Action Buttons */}
                <div className="flex gap-4 mb-6 h-12 items-center">
                    {phase === 'BIDDING' && currentTurn === 0 && (
                        <>
                            <button onClick={() => handleBid(1)} className="px-6 py-2 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95 bg-yellow-600 hover:bg-yellow-500">1 Point</button>
                            <button onClick={() => handleBid(2)} className="px-6 py-2 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95 bg-yellow-600 hover:bg-yellow-500">2 Points</button>
                            <button onClick={() => handleBid(3)} className="px-6 py-2 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95 bg-yellow-600 hover:bg-yellow-500">3 Points</button>
                            <button onClick={() => handleBid(0)} className="px-6 py-2 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95 bg-gray-600 hover:bg-gray-500">Pass</button>
                        </>
                    )}
                    {phase === 'PLAYING' && currentTurn === 0 && (
                        <>
                            <button onClick={onPlayClick} className="px-6 py-2 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95 bg-blue-600 hover:bg-blue-500">Play</button>
                            <button onClick={onHintClick} className="px-6 py-2 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95 bg-green-600 hover:bg-green-500">Hint</button>
                            <button onClick={onPassClick} className="px-6 py-2 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95 bg-gray-600 hover:bg-gray-500">Pass</button>
                        </>
                    )}
                </div>

                {players[0] && (
                    <>
                        <PlayerHand
                            cards={phase === 'DEALING' ? players[0].hand.slice(0, cardsDealt) : players[0].hand}
                            isHuman
                            onCardClick={handleCardClick}
                            onSelectionChange={handleSelectionChange}
                        />
                        <div className={`flex items-center gap-2 mt-4 px-6 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 transition-all duration-300 ${currentTurn === 0 ? 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-105' : ''}`}>
                            {getPlayerIcon(players[0].id)}
                            <span className="text-white font-bold text-lg">You</span>
                            {currentTurn === 0 && <span className="text-yellow-400 font-bold ml-2">(Your Turn)</span>}
                        </div>
                    </>
                )}
            </div>

            {/* Game Over Modal */}
            <AnimatePresence>
                {phase === 'GAME_OVER' && (
                    <GameOverModal
                        winnerName={players.find(p => p.id === winnerId)?.name || 'Unknown'}
                        isWinner={winnerId === players[0].id}
                        result={gameResult}
                        onRestart={startGame}
                    />
                )}
            </AnimatePresence>

            {/* Sound Toggle Button */}
            <SoundToggle />

            {/* Auto-Play Toggle Button */}
            <button
                onClick={toggleAutoPlay}
                className="fixed bottom-4 left-4 z-50 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm flex items-center gap-2"
                title={players[0]?.isAutoPlay ? 'Disable auto-play' : 'Enable auto-play'}
            >
                {players[0]?.isAutoPlay ? (
                    <>
                        <BotOff className="w-6 h-6" />
                        <span className="text-xs">AI ON</span>
                    </>
                ) : (
                    <Bot className="w-6 h-6" />
                )}
            </button>

            {/* Debug Overlay */}
            <DebugOverlay players={players} aiReasons={aiReasons} />
        </div>
    );
}
