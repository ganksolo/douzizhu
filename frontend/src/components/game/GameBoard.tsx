import { useGameStore } from '../../store/game.store';
import { useRoomStore } from '../../store/room.store';
import { PlayerAvatar } from './PlayerAvatar';
import { Card } from './Card';
import { useState, useMemo } from 'react';
import { PlayerHand } from '../PlayerHand';
import { Clock } from 'lucide-react';
import type { Card as CardType } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { SocketService } from '../../services/socket';

// --- Card Logic Helpers ---
const getCardData = (value: number): CardType => {
    // Basic mapping, ID is stringified value
    const id = value.toString();

    // 0-51: Regular cards
    // 52: Black Joker
    // 53: Red Joker
    if (value === 52) return { id, value, suit: 'joker', rank: 'black_joker', isSelected: false };
    if (value === 53) return { id, value, suit: 'joker', rank: 'red_joker', isSelected: false };

    const suits = ['diamonds', 'clubs', 'hearts', 'spades'] as const;
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;

    const suitIndex = Math.floor(value / 13);
    const rankIndex = value % 13;

    return {
        id,
        value,
        suit: suits[suitIndex],
        rank: ranks[rankIndex],
        isSelected: false
    };
};

export const GameBoard = () => {
    // Stores
    const roomPlayers = useRoomStore((state) => state.players);
    const roomId = useRoomStore((state) => state.roomId);
    const getRelativeSeat = useGameStore((state) => state.getRelativeSeat);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const bottomCards = useGameStore((state) => state.bottomCards);
    const lastPlayedCards = useGameStore((state) => state.lastPlayedCards);
    const myHand = useGameStore((state) => state.myHand);
    const phase = useGameStore((state) => state.phase);
    const gamePlayers = useGameStore((state) => state.players);
    const highestBid = useGameStore((state) => state.highestBid);
    const landlordSeatIndex = useGameStore((state) => state.landlordSeatIndex);

    const [selectedCards, setSelectedCards] = useState<number[]>([]);

    // Helper to get UI player
    const getUIPlayer = (position: 'bottom' | 'right' | 'top' | 'left') => {
        return roomPlayers.find(p => p.seatId !== undefined && getRelativeSeat(p.seatId) === position);
    };

    // Helper to get player hand count from game store
    const getPlayerHandCount = (seatId: number | undefined): number => {
        if (seatId === undefined) return 0;
        const gamePlayer = gamePlayers.find(p => p.seatIndex === seatId);
        return gamePlayer?.handCount ?? 0;
    };

    const bottomPlayer = getUIPlayer('bottom');
    const rightPlayer = getUIPlayer('right');
    const topPlayer = getUIPlayer('top');
    const leftPlayer = getUIPlayer('left');

    const handleSelectionChange = (selectedIds: string[]) => {
        const selectedValues = selectedIds.map(id => parseInt(id, 10));
        setSelectedCards(selectedValues);
    };

    // Memoize hand cards for PlayerHand component
    const handCards = useMemo(() => {
        return myHand.map(val => ({
            ...getCardData(val),
            isSelected: selectedCards.includes(val)
        }));
    }, [myHand, selectedCards]);

    // Calculate canPass logic
    // I can pass if I am NOT the leader. 
    // Leader means lastPlayedCards is null OR lastPlayedCards.playerId is me.
    // However, `lastPlayedCards` from store has `seatIndex` and `cards`. `playerId` might not be there?
    // Let's check store definition. Phase 23.5 said `seatIndex` is verified.
    // If seatIndex === mySeatId, then I am leader.
    const mySeatId = bottomPlayer?.seatId;
    const isLeader = lastPlayedCards === null || (mySeatId !== undefined && lastPlayedCards.seatIndex === mySeatId);
    const canPass = !isLeader;

    // --- Table Area Rendering ---
    // If lastPlayedCards exists, determine its relative position to show visually on table
    const lastPlayedPosition = lastPlayedCards ? getRelativeSeat(lastPlayedCards.seatIndex) : null;

    // --- Game Control Handlers ---
    const handlePlay = () => {
        if (selectedCards.length === 0) return;
        console.log('[GameBoard] Playing cards:', selectedCards);
        SocketService.emit('client_action', {
            type: 'PLAY',
            roomId: roomId,
            payload: { cards: selectedCards }
        });
        setSelectedCards([]); // Clear selection after play
    };

    const handlePass = () => {
        console.log('[GameBoard] Passing turn');
        SocketService.emit('client_action', {
            type: 'PASS',
            roomId: roomId
        });
    };

    const handleHint = () => {
        console.log('[GameBoard] Requesting hint');
        // TODO: Implement hint logic with getHint utility
    };

    const handleBid = (bidAmount: number) => {
        console.log('[GameBoard] Bidding:', bidAmount, 'roomId:', roomId);
        SocketService.emit('client_action', {
            type: 'BID',
            roomId: roomId,
            payload: { bid: bidAmount }
        });
    };

    // Helper to render played cards
    const renderPlayedCards = (cards: number[]) => (
        <div className="flex -space-x-8 scale-75 origin-center">
            {cards.map((val, i) => {
                const data = getCardData(val);
                return <Card key={i} suit={data.suit as any} rank={data.rank} />;
            })}
        </div>
    );

    return (
        <div className="w-full h-screen bg-green-900 relative overflow-hidden flex flex-col items-center justify-center select-none">
            {/* Table Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2f855a_0%,_#14532d_100%)] opacity-80 pointer-events-none"></div>

            {/* --- Phase Indicators --- */}
            {phase === 'DEALING' && (
                <div className="absolute top-1/4 z-50 bg-black/60 text-white px-6 py-3 rounded-full animate-bounce">
                    Dealing cards...
                </div>
            )}

            {/* --- Central Area (Dipai & Bidding) --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-20">
                {/* Dipai (Bottom Cards) - Centered */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="flex gap-2 p-4 bg-black/50 backdrop-blur-md rounded-2xl border border-yellow-400/30 shadow-2xl"
                >
                    {bottomCards.length > 0 ? (
                        bottomCards.map((val, i) => {
                            const data = getCardData(val);
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card
                                        suit={data.suit as any}
                                        rank={phase === 'BIDDING' || phase === 'DEALING' ? '' : data.rank}
                                        scale={0.7}
                                        hidden={phase === 'BIDDING' || phase === 'DEALING'}
                                    />
                                </motion.div>
                            );
                        })
                    ) : (
                        Array(8).fill(0).map((_, i) => (
                            <Card key={i} suit="spades" rank="" scale={0.7} hidden />
                        ))
                    )}
                </motion.div>

                {/* Bidding Prompt */}
                {phase === 'BIDDING' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-white text-lg font-bold bg-black/60 px-6 py-3 rounded-full backdrop-blur-sm flex flex-col items-center gap-2"
                    >
                        <div className="flex items-center gap-2">
                            🎯 叫分阶段
                        </div>
                        {currentTurn !== null && (
                            <div className="text-sm font-normal text-yellow-300">
                                {currentTurn === bottomPlayer?.seatId ? (
                                    '轮到你叫分'
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                                        轮到 {
                                            roomPlayers.find(p => p.seatId === currentTurn)?.username || `座位 ${currentTurn}`
                                        } 叫分...
                                    </span>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Table Played Cards Area (4 Quadrants) */}
            <div className="absolute inset-0 pointer-events-none">
                <AnimatePresence mode="wait">
                    {/* Top Player's Turn */}
                    {lastPlayedPosition === 'top' && lastPlayedCards && (
                        <motion.div
                            key="top-play"
                            initial={{ y: -20, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -20, opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="absolute top-32 left-1/2 -translate-x-1/2"
                        >
                            {renderPlayedCards(lastPlayedCards.cards)}
                        </motion.div>
                    )}

                    {/* Left Player's Turn */}
                    {lastPlayedPosition === 'left' && lastPlayedCards && (
                        <motion.div
                            key="left-play"
                            initial={{ x: -20, opacity: 0, scale: 0.8 }}
                            animate={{ x: 0, opacity: 1, scale: 1 }}
                            exit={{ x: -20, opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="absolute left-32 top-1/2 -translate-y-1/2"
                        >
                            {renderPlayedCards(lastPlayedCards.cards)}
                        </motion.div>
                    )}

                    {/* Right Player's Turn */}
                    {lastPlayedPosition === 'right' && lastPlayedCards && (
                        <motion.div
                            key="right-play"
                            initial={{ x: 20, opacity: 0, scale: 0.8 }}
                            animate={{ x: 0, opacity: 1, scale: 1 }}
                            exit={{ x: 20, opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="absolute right-32 top-1/2 -translate-y-1/2"
                        >
                            {renderPlayedCards(lastPlayedCards.cards)}
                        </motion.div>
                    )}

                    {/* Bottom Player's Turn */}
                    {lastPlayedPosition === 'bottom' && lastPlayedCards && (
                        <motion.div
                            key="bottom-play"
                            initial={{ y: 20, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="absolute bottom-40 left-1/2 -translate-x-1/2"
                        >
                            {renderPlayedCards(lastPlayedCards.cards)}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            {/* --- Players --- */}

            {/* TOP Player */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
                {topPlayer && (
                    <PlayerAvatar
                        username={topPlayer.username}
                        avatar={topPlayer.avatar}
                        position="top"
                        handCount={getPlayerHandCount(topPlayer.seatId)}
                        isBot={topPlayer.isBot}
                        isTurn={currentTurn === topPlayer.seatId}
                        isLandlord={topPlayer.seatId === landlordSeatIndex}
                    />
                )}
            </div>

            {/* LEFT Player */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2">
                {leftPlayer && (
                    <PlayerAvatar
                        username={leftPlayer.username}
                        avatar={leftPlayer.avatar}
                        position="left"
                        handCount={getPlayerHandCount(leftPlayer.seatId)}
                        isBot={leftPlayer.isBot}
                        isTurn={currentTurn === leftPlayer.seatId}
                        isLandlord={leftPlayer.seatId === landlordSeatIndex}
                    />
                )}
            </div>

            {/* RIGHT Player */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                {rightPlayer && (
                    <PlayerAvatar
                        username={rightPlayer.username}
                        avatar={rightPlayer.avatar}
                        position="right"
                        handCount={getPlayerHandCount(rightPlayer.seatId)}
                        isBot={rightPlayer.isBot}
                        isTurn={currentTurn === rightPlayer.seatId}
                        isLandlord={rightPlayer.seatId === landlordSeatIndex}
                    />
                )}
            </div>

            {/* BOTTOM Player (Me) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full flex flex-col items-center gap-4">

                {/* My Hand Cards (Using PlayerHand) */}
                <div className="w-full flex justify-center pb-4">
                    <PlayerHand
                        cards={handCards}
                        isHuman={true}
                        onSelectionChange={handleSelectionChange}
                        className="scale-90 origin-bottom"
                    />
                </div>

                {/* My Avatar & Controls */}
                <div className="flex items-center gap-8 bg-black/30 px-8 py-2 rounded-2xl backdrop-blur-md">
                    {bottomPlayer && (
                        <PlayerAvatar
                            username={bottomPlayer.username}
                            avatar={bottomPlayer.avatar}
                            position="bottom"
                            isBot={bottomPlayer.isBot}
                            isTurn={currentTurn === bottomPlayer.seatId}
                            isLandlord={bottomPlayer.seatId === landlordSeatIndex}
                        />
                    )}

                    {currentTurn === bottomPlayer?.seatId && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute left-[34%] -top-10 flex items-center text-xs text-yellow-200 bg-yellow-900/80 px-3 py-1 rounded-full animate-pulse border border-yellow-500/30"
                        >
                            <Clock size={14} className="mr-1.5" />
                            <span className="font-mono font-bold">30s</span>
                        </motion.div>
                    )}

                    {/* Game Control Buttons */}
                    <div className="flex gap-4 items-center">
                        {/* BIDDING Phase Buttons */}
                        {phase === 'BIDDING' && currentTurn === bottomPlayer?.seatId && (
                            <AnimatePresence>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex flex-col items-center gap-3"
                                >
                                    {/* Current Highest Bid Indicator */}
                                    {highestBid > 0 && (
                                        <div className="text-yellow-300 text-sm font-semibold bg-black/40 px-4 py-1 rounded-full">
                                            当前最高: {highestBid} 分
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        {[1, 2, 3].map(bid => {
                                            const isDisabled = bid <= highestBid;
                                            return (
                                                <motion.button
                                                    key={bid}
                                                    onClick={() => !isDisabled && handleBid(bid)}
                                                    whileHover={!isDisabled ? { scale: 1.05, y: -2 } : {}}
                                                    whileTap={!isDisabled ? { scale: 0.95 } : {}}
                                                    disabled={isDisabled}
                                                    className={`px-8 py-3 rounded-xl font-bold shadow-xl transition-all border-2 ${isDisabled
                                                        ? 'bg-gray-500/50 text-gray-400 border-gray-500/30 cursor-not-allowed'
                                                        : 'text-white bg-gradient-to-br from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 border-yellow-300/50 cursor-pointer'
                                                        }`}
                                                >
                                                    {bid} 分
                                                </motion.button>
                                            );
                                        })}
                                        <motion.button
                                            onClick={() => handleBid(0)}
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="px-8 py-3 rounded-xl text-white font-bold shadow-xl transition-all bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 border-2 border-gray-400/50"
                                        >
                                            不叫
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        )}

                        {/* PLAYING Phase Buttons */}
                        {phase === 'PLAYING' && (
                            <AnimatePresence>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex gap-3"
                                >
                                    <motion.button
                                        onClick={handlePlay}
                                        disabled={currentTurn !== bottomPlayer?.seatId || selectedCards.length === 0}
                                        whileHover={currentTurn === bottomPlayer?.seatId && selectedCards.length > 0 ? { scale: 1.05, y: -2 } : {}}
                                        whileTap={currentTurn === bottomPlayer?.seatId && selectedCards.length > 0 ? { scale: 0.95 } : {}}
                                        className={`px-8 py-3 rounded-xl text-white font-bold shadow-xl transition-all border-2 ${currentTurn === bottomPlayer?.seatId && selectedCards.length > 0
                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border-blue-300/50 cursor-pointer'
                                            : 'bg-gray-500/50 border-gray-400/30 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        🃏 Play ({selectedCards.length})
                                    </motion.button>
                                    <motion.button
                                        onClick={handleHint}
                                        disabled={currentTurn !== bottomPlayer?.seatId}
                                        whileHover={currentTurn === bottomPlayer?.seatId ? { scale: 1.05, y: -2 } : {}}
                                        whileTap={currentTurn === bottomPlayer?.seatId ? { scale: 0.95 } : {}}
                                        className={`px-8 py-3 rounded-xl text-white font-bold shadow-xl transition-all border-2 ${currentTurn === bottomPlayer?.seatId
                                            ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 border-green-300/50 cursor-pointer'
                                            : 'bg-gray-500/50 border-gray-400/30 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        💡 Hint
                                    </motion.button>
                                    <motion.button
                                        onClick={handlePass}
                                        disabled={currentTurn !== bottomPlayer?.seatId || !canPass}
                                        whileHover={currentTurn === bottomPlayer?.seatId && canPass ? { scale: 1.05, y: -2 } : {}}
                                        whileTap={currentTurn === bottomPlayer?.seatId && canPass ? { scale: 0.95 } : {}}
                                        className={`px-8 py-3 rounded-xl text-white font-bold shadow-xl transition-all border-2 ${currentTurn === bottomPlayer?.seatId && canPass
                                            ? 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 border-gray-400/50 cursor-pointer'
                                            : 'bg-gray-500/50 border-gray-400/30 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        ⏭️ Pass
                                    </motion.button>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};
