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

export function GameTable() {
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
        startGame,
        handleBid,
        handlePlay,
        handlePass,
        setPlayers,
    } = useGameLoop();

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

    const handleSelectionChange = (selectedCardIds: string[], _isAdditive: boolean = false) => {
        if (currentTurn !== 0 || phase !== 'PLAYING') return;

        setPlayers((prevPlayers) => {
            const newPlayers = [...prevPlayers];
            const humanHand = newPlayers[0].hand.map((card) => {
                if (selectedCardIds.includes(card.id)) {
                    return { ...card, isSelected: true };
                }
                // If not additive (new selection), deselect others. 
                // If additive (e.g. Ctrl+Click or just dragging over new ones?), usually drag select replaces selection or adds to it.
                // Standard file explorer: Drag replaces selection unless Ctrl is held.
                // Let's go with: Drag selects these cards. If we want to be fancy, we can check modifier keys later.
                // For now, let's make it simple: The passed IDs become selected. Others become unselected?
                // Or maybe just "Select these".
                // Let's try: "Set selection to exactly these IDs".
                return { ...card, isSelected: selectedCardIds.includes(card.id) };
            });
            newPlayers[0] = { ...newPlayers[0], hand: humanHand };
            return newPlayers;
        });
    };

    const onPlayClick = () => {
        const selectedCards = players[0].hand.filter((c) => c.isSelected);
        if (selectedCards.length === 0) {
            alert('Please select cards to play.');
            return;
        }
        handlePlay(selectedCards);
    };

    const onHintClick = () => {
        if (!players[0]) return;
        // Fix: lastPlayedCards might be null, but getHint expects { type, value } | null.
        // lastPlayedCards from useGameLoop is { cards: Card[], type: HandType, value: number, playerId: string } | null
        // We need to pass the whole object or just type/value?
        // getHint signature: (hand: Card[], lastPlayedCards: { type: HandType; value: number } | null)
        // The object from useGameLoop matches the shape required (it has type and value).
        // TS might complain about extra properties if strict, but usually it's fine.
        // Wait, the error said: Property 'value' is missing in type '{ cards: Card[]; playerId: string; type: any; }'
        // It seems useGameLoop's lastPlayedCards doesn't have 'value'?
        // Let's check useGameLoop.ts.

        const hint = getHint(players[0].hand, lastPlayedCards as any); // Cast for now to fix lint if type mismatch exists
        if (hint) {
            const hintIds = hint.map(c => c.id);
            handleSelectionChange(hintIds, false);
        } else {
            // No move possible, maybe suggest pass?
        }
    };

    if (players.length === 0 && !isShuffling) return <div>Loading...</div>;

    const getPlayerIcon = (playerId: string) => {
        if (landlordId === playerId) return <Crown className="text-yellow-400 w-6 h-6" />;
        return <User className="text-gray-300 w-6 h-6" />;
    };

    return (
        <div className="relative w-full h-screen overflow-hidden flex flex-col font-sans" style={{ backgroundColor: 'var(--table-bg)', color: 'var(--text-color)' }}>
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

            {/* Center Area */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-8 z-10">
                {/* Bottom Cards */}
                <div className="flex gap-2 p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-xl">
                    {bottomCards.length > 0 ? (
                        bottomCards.map(card => <Card key={card.id} card={card} small={phase !== 'GAME_OVER'} isBack={phase === 'BIDDING' || phase === 'DEALING'} />)
                    ) : (
                        <div className="text-white/50 text-sm font-medium">Bottom Cards</div>
                    )}
                </div>

                {/* Last Played Cards */}
                <div className="min-h-[160px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {lastPlayedCards ? (
                            <motion.div
                                key={lastPlayedCards.playerId} // Key change triggers animation
                                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                animate={{ scale: 1.1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="flex -space-x-8"
                            >
                                {lastPlayedCards.cards.map(card => <Card key={card.id} card={card} />)}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-white/50 text-lg font-medium italic"
                            >
                                {phase === 'BIDDING' ? 'Bidding Phase...' : phase === 'DEALING' ? 'Dealing...' : 'Waiting for play...'}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
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
                            <button onClick={handlePass} className="px-6 py-2 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95 bg-gray-600 hover:bg-gray-500">Pass</button>
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
                        onRestart={startGame}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
