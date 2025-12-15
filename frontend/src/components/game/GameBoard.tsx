import { useGameStore } from '../../store/game.store';
import { useRoomStore } from '../../store/room.store';
import { useToastStore } from '../../store/toast.store';
import { PlayerAvatar } from './PlayerAvatar';
import { Card } from './Card';
import { GameEndModal } from './GameEndModal';
import { DebugStatePanel } from '../DebugStatePanel';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { PlayerHand } from '../PlayerHand';
import type { Card as CardType } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { SocketService } from '../../services/socket';
import { useTurnTimer } from '../../hooks/useTurnTimer';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

// --- Card Logic Helpers ---
const getCardData = (value: number): CardType => {
    // Basic mapping, ID is stringified value
    const id = value.toString();

    // 0-51: Regular cards
    // 52: Black Joker
    // 53: Red Joker
    if (value === 52) return { id, value, suit: 'joker_black' as any, rank: 'JOKER' as any, isSelected: false };
    if (value === 53) return { id, value, suit: 'joker_red' as any, rank: 'JOKER' as any, isSelected: false };

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

// Issue #32: 解析后端卡牌字符串 (e.g., "♦3", "♥A", "BlackJoker") 为数值
const parseCardString = (cardStr: string): number => {
    // Special cases: Jokers
    if (cardStr === 'BlackJoker' || cardStr === 'BJ' || cardStr === 'JOKER_BLACK') return 52;
    if (cardStr === 'RedJoker' || cardStr === 'RJ' || cardStr === 'JOKER_RED') return 53;

    // Format: "{suit}{rank}" e.g., "♦3", "♥10", "♠A"
    // 花色符号在第一位
    const suits: Record<string, number> = { '♦': 0, '♣': 1, '♥': 2, '♠': 3, 'D': 0, 'C': 1, 'H': 2, 'S': 3 };
    const ranks: Record<string, number> = {
        '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6,
        '10': 7, 'J': 8, 'Q': 9, 'K': 10, 'A': 11, '2': 12
    };

    // 花色在第一位
    const suitChar = cardStr.charAt(0);
    const rankStr = cardStr.slice(1).toUpperCase();

    const suitIndex = suits[suitChar];
    const rankIndex = ranks[rankStr];

    if (suitIndex === undefined || rankIndex === undefined) {
        console.warn('[parseCardString] Invalid card string:', cardStr);
        return -1;
    }

    return suitIndex * 13 + rankIndex;
};

// Issue #33: 将数值转换为后端期望的卡牌字符串格式 (e.g., "♦3", "♥A", "BlackJoker")
const valueToCardString = (value: number): string => {
    // Special cases: Jokers
    if (value === 52) return 'BlackJoker';
    if (value === 53) return 'RedJoker';

    // Suit mapping: 使用符号，后端期望格式
    const suits = ['♦', '♣', '♥', '♠'];  // Diamonds, Clubs, Hearts, Spades
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

    const suitIndex = Math.floor(value / 13);
    const rankIndex = value % 13;

    if (suitIndex < 0 || suitIndex > 3 || rankIndex < 0 || rankIndex > 12) {
        console.warn('[valueToCardString] Invalid card value:', value);
        return '';
    }

    // BE 期望格式: 花色符号在前，rank 在后
    return `${suits[suitIndex]}${ranks[rankIndex]}`;
};

export const GameBoard = () => {
    // Stores
    const roomPlayers = useRoomStore((state) => state.players);
    const roomId = useRoomStore((state) => state.roomId);
    const addToast = useToastStore((state) => state.addToast);
    const getRelativeSeat = useGameStore((state) => state.getRelativeSeat);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const bottomCards = useGameStore((state) => state.bottomCards);
    const lastPlayedCards = useGameStore((state) => state.lastPlayedCards);
    const myHand = useGameStore((state) => state.myHand);
    const phase = useGameStore((state) => state.phase);
    const gamePlayers = useGameStore((state) => state.players);
    const highestBid = useGameStore((state) => state.highestBid);
    const landlordSeatIndex = useGameStore((state) => state.landlordSeatIndex);
    const gameEnd = useGameStore((state) => state.gameEnd);
    const mySeatId = useGameStore((state) => state.mySeatId);
    const bidHistory = useGameStore((state) => state.bidHistory); // Add this
    const resetGame = useGameStore((state) => state.resetGame);
    const resetRoom = useRoomStore((state) => state.resetRoom);
    const navigate = useNavigate();

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

    // Helper to get last bid for a player
    const getLastBid = (seatId: number | undefined): number | null => {
        if (seatId === undefined) return null;
        // bidHistory is array of { seatIndex, bid }
        const playerBids = bidHistory.filter(b => b.seatIndex === seatId);
        if (playerBids.length === 0) return null;
        return playerBids[playerBids.length - 1].bid;
    };

    const bottomPlayer = getUIPlayer('bottom');
    const rightPlayer = getUIPlayer('right');
    const topPlayer = getUIPlayer('top');
    const leftPlayer = getUIPlayer('left');

    const handleSelectionChange = (selectedIds: string[]) => {
        const selectedValues = selectedIds.map(id => parseInt(id, 10));
        setSelectedCards(selectedValues);
    };

    // Issue #31: 单击卡牌切换选中状态
    const handleCardClick = useCallback((card: CardType) => {
        const cardValue = parseInt(card.id, 10);
        setSelectedCards(prev =>
            prev.includes(cardValue)
                ? prev.filter(c => c !== cardValue) // 取消选中
                : [...prev, cardValue]               // 添加选中
        );
    }, []);

    // Memoize hand cards for PlayerHand component
    // Fix: Use index to generate unique id for 2-deck games (same card values exist)
    const handCards = useMemo(() => {
        return myHand.map((val, index) => ({
            ...getCardData(val),
            id: `${val}-${index}`, // Unique id: value + index
            isSelected: selectedCards.includes(val)
        }));
    }, [myHand, selectedCards]);

    // Issue #47 Problem 2: 过滤不存在于手牌中的选中牌
    useEffect(() => {
        setSelectedCards(prev => prev.filter(v => myHand.includes(v)));
    }, [myHand]);


    // Phase Handlers
    const handleBid = (points: number) => {
        SocketService.emit('client_action', {
            type: 'BID',
            roomId,
            payload: { bid: points }
        });
    };

    const handlePlay = () => {
        if (selectedCards.length === 0) return;

        // Convert to backend format cards
        const cardsStr = selectedCards.map(v => valueToCardString(v));

        SocketService.emit('client_action', {
            type: 'PLAY',
            roomId,
            payload: cardsStr
        });

        // Optimistically clear selection
        setSelectedCards([]);
    };

    const handlePass = () => {
        SocketService.emit('client_action', {
            type: 'PASS',
            roomId,
            payload: {}
        });
    };

    const handleHint = () => {
        console.log('[GameBoard] Requesting hint for room:', roomId);
        SocketService.emit('request_hint', { roomId });
    };

    // Handlers for Game End Modal
    const handlePlayAgain = () => {
        resetGame(); // Clear game state
        // In a real app, might just set ready again
        // For now, toggle ready state
        SocketService.emit('toggle_ready', { roomId, isReady: true });
    };

    const handleExit = () => {
        resetGame();
        resetRoom();
        api.room.leave(roomId!).then(() => {
            navigate('/lobby');
        });
    };

    // Auto-select helper (optional)
    useEffect(() => {
        // If needed, can auto clear selection on turn change
    }, [currentTurn]);

    // Issue #31: 只有轮到自己出牌且可以Pass时，Pass按钮才可用
    // 逻辑: 如果上一手牌是别人的, 我必须管 (不能 Pass 除非我也要不起 - 但这里前端不强制判断要不起，只判是否首出)
    // 修正: 斗地主逻辑:
    // 1. 如果 LastPlayedCards 是空的 (New Round), 或者是 我自己的 (Round Loop), 我不能 Pass, must play.
    // 2. 否则 (Last played is opponent), can Pass.
    const canPass = useMemo(() => {
        // Issue #40: Debug logging
        console.log('[canPass] Check:', {
            lastPlayedCards,
            mySeatId,
            lpSeatIndex: lastPlayedCards?.seatIndex,
            lpSeatIndexType: typeof lastPlayedCards?.seatIndex,
            mySeatIdType: typeof mySeatId
        });

        if (!lastPlayedCards) return false; // No previous cards, must play (Start of game or new round)
        // Issue #40: Use Number() to ensure consistent type comparison
        if (Number(lastPlayedCards.seatIndex) === Number(mySeatId)) return false; // I played last biggest, everyone passed, my turn again.
        return true;
    }, [lastPlayedCards, mySeatId]);


    // Watch for backend hints
    useEffect(() => {
        const onHintResult = (data: { cards: string[], error?: string }) => {
            console.log('[GameBoard] Hint received:', data.cards, 'error:', data.error);
            if (data.error) {
                console.warn('[GameBoard] Hint error:', data.error);
                addToast({ message: `提示错误: ${data.error}`, type: 'error' });
                return;
            }
            if (data.cards && data.cards.length > 0) {
                // Select these cards
                // Map string back to values
                const values = data.cards.map(s => parseCardString(s));
                console.log('[GameBoard] Selecting hint cards:', values);
                setSelectedCards(values);
                addToast({ message: `建议出 ${data.cards.length} 张牌`, type: 'info', duration: 2000 });
            } else {
                // Hint suggests PASS - clear selection and show visual feedback
                console.log('[GameBoard] Hint suggests PASS - clearing selection');
                setSelectedCards([]);
                addToast({ message: '无法压过，建议 Pass', type: 'info', duration: 2500 });
            }
        };
        SocketService.on('hint_result', onHintResult);
        return () => {
            SocketService.off('hint_result', onHintResult);
        };
    }, [addToast]);

    // Issue #31: Timer styling - Fix 15s bug by explicit duration
    // Issue #41: Add onTimeout callback for auto-action
    const handleTimeout = useCallback(() => {
        console.log('[GameBoard] Timeout! Phase:', phase, 'canPass:', canPass);
        if (phase === 'BIDDING') {
            handleBid(0); // 不叫
        } else if (phase === 'PLAYING') {
            if (canPass) {
                handlePass();
            } else {
                // Cannot pass, must play - request hint for auto-play
                handleHint();
                // After 1 second, auto-play selected cards if hint provided
                setTimeout(() => {
                    // This is a fallback; ideally hint_result listener handles it
                    console.log('[GameBoard] Auto-play timeout fallback');
                }, 1000);
            }
        }
    }, [phase, canPass, handleBid, handlePass, handleHint]);

    const { remainingTime } = useTurnTimer(currentTurn === mySeatId, currentTurn, {
        turnDuration: 15, // Issue #45: Changed from 30s to 15s
        onTimeout: handleTimeout
    });

    // Watch for Game End
    // No specific effect needed if we just render modal based on store state

    // Fix Issue #31: Cleanup on unmount
    useEffect(() => {
        return () => {
            // Optional cleanup
        };
    }, [resetGame, resetRoom, navigate]);

    // --- Table Area Rendering ---
    // If lastPlayedCards exists, determine its relative position to show visually on table
    const lastPlayedPosition = lastPlayedCards ? getRelativeSeat(lastPlayedCards.seatIndex) : null;

    // Debug: Log lastPlayedCards state
    useEffect(() => {
        console.log('[GameBoard] Render check:', {
            lastPlayedCards: lastPlayedCards ? { seatIndex: lastPlayedCards.seatIndex, cardCount: lastPlayedCards.cards.length } : null,
            lastPlayedPosition,
            mySeatId,
            willRenderTop: lastPlayedPosition === 'top' && !!lastPlayedCards,
            willRenderLeft: lastPlayedPosition === 'left' && !!lastPlayedCards,
            willRenderRight: lastPlayedPosition === 'right' && !!lastPlayedCards,
            willRenderBottom: lastPlayedPosition === 'bottom' && !!lastPlayedCards,
        });
    }, [lastPlayedCards, lastPlayedPosition, mySeatId]);

    // Helper to render played cards
    const renderPlayedCards = (cards: number[]) => (
        <div className="flex -space-x-4 scale-90 origin-center">
            {cards.map((val, i) => {
                const data = getCardData(val);
                return <Card key={i} suit={data.suit as any} rank={data.rank} scale={0.85} />;
            })}
        </div>
    );

    return (
        <div className="w-full h-screen bg-[rgb(50,85,66)] relative overflow-hidden flex flex-col items-center justify-center select-none font-sans">
            {/* Issue #48: Enhanced Debug Panel */}
            <DebugStatePanel selectedCards={selectedCards} canPass={canPass} />

            {/* --- Background --- */}
            {/* Table Cloth Texture (Green dots) */}
            <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(rgb(26, 77, 51) 1px, transparent 1px)',
                backgroundSize: '4px 4px',
                backgroundColor: 'rgb(50, 85, 66)' // Updated base color
            }}></div>

            {/* Lighting/Vignette Overlay */}
            <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.6) 80%)'
            }}></div>

            {/* Center Pattern (Circle + Diamond) - Persistent and Thickened */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vh] h-[60vh] opacity-20 pointer-events-none z-0">
                {/* Circle - Thickened by 10px */}
                <div className="absolute inset-0 rounded-full border-[10px] border-[#8dafa0]"></div>
                {/* Diamond (Rotated Square) */}
                <div className="absolute inset-[14.6%] border-2 border-[#8dafa0] transform rotate-45"></div>
            </div>

            {/* Issue #34: Game End Modal */}
            <AnimatePresence>
                {phase === 'GAME_END' && gameEnd && (
                    <GameEndModal
                        winnerId={gameEnd.winnerId}
                        isLandlordWin={gameEnd.isLandlordWin}
                        multiplier={gameEnd.multiplier}
                        mySeatId={mySeatId}
                        landlordSeatIndex={landlordSeatIndex}
                        onPlayAgain={handlePlayAgain}
                        onExit={handleExit}
                    />
                )}
            </AnimatePresence>

            {/* --- 左上角工具栏 (Debug/Settings) --- */}
            <div className="absolute top-4 left-4 flex items-center gap-2 z-50">
                {/* Icons... (Keep existing logic, just ensure colors contrast well) */}
                <button
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80 bg-[#1f2937]/80 text-[#d4af37] border border-[#d4af37]/30"
                    onClick={() => { }}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
                <button
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80 bg-[#1f2937]/80 text-[#d4af37] border border-[#d4af37]/30"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </button>
                <button
                    onClick={handleExit}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80 bg-[#1f2937]/80 text-[#ef4444] border border-[#ef4444]/30"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
            </div>

            {/* --- Phase Indicators --- */}
            {phase === 'DEALING' && (
                <div className="absolute top-1/4 z-50 bg-black/60 text-white px-8 py-3 rounded-full animate-bounce font-medium backdrop-blur-md border border-white/10">
                    Dealing cards...
                </div>
            )}

            {/* --- Central Area (Dipai & Bidding Prompt) --- */}
            {/* Issue: 8 cards should be in horizontal vertical center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-20">
                {/* Dipai (Bottom Cards) - 扇形排列 */}
                {/* Dipai (Bottom Cards) - 扇形排列 */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="relative h-32 w-[500px] flex items-center justify-center pointer-events-none"
                >
                    {bottomCards.length > 0 ? (
                        bottomCards.map((val, i) => {
                            const data = getCardData(val);
                            const totalCards = bottomCards.length;
                            const centerIndex = (totalCards - 1) / 2;
                            // Use pixel-based spacing (30px) instead of percentage to guarantee spread
                            const xOffset = (i - centerIndex) * 30;
                            const rotation = (i - centerIndex) * 4; // Gentle fanning
                            const translateY = Math.abs(i - centerIndex) * 2; // Slight arch

                            return (
                                <motion.div
                                    key={i}
                                    initial={{ y: -40, opacity: 0, rotate: 0 }}
                                    animate={{
                                        y: translateY,
                                        opacity: 1,
                                        rotate: rotation
                                    }}
                                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                                    className="absolute origin-bottom"
                                    style={{
                                        left: `calc(50% + ${xOffset}px)`,
                                        transform: `translateX(-50%)`, // We handle rotation in animate, but this keeps center alignment
                                        zIndex: i,
                                    }}
                                >
                                    <Card
                                        suit={data.suit as any}
                                        rank={phase === 'BIDDING' || phase === 'DEALING' ? '' : data.rank}
                                        scale={0.8}
                                        hidden={phase === 'BIDDING' || phase === 'DEALING'}
                                    />
                                </motion.div>
                            );
                        })
                    ) : (
                        Array(8).fill(0).map((_, i) => {
                            const centerIndex = 3.5;
                            const xOffset = (i - centerIndex) * 30;
                            const rotation = (i - centerIndex) * 4;
                            const translateY = Math.abs(i - centerIndex) * 2;

                            return (
                                <div
                                    key={i}
                                    className="absolute origin-bottom"
                                    style={{
                                        left: `calc(50% + ${xOffset}px)`,
                                        transform: `translateX(-50%) rotate(${rotation}deg)`,
                                        top: `${translateY}px`,
                                        zIndex: i,
                                    }}
                                >
                                    <Card suit="spades" rank="" scale={0.8} hidden />
                                </div>
                            );
                        })
                    )}
                </motion.div>

                {/* Bidding Prompt - Moved up 40px (mb-10 or -translate-y) */}
                {phase === 'BIDDING' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: -40 }}
                        className="text-white text-lg font-bold bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm flex flex-col items-center gap-1 border border-white/10"
                    >
                        <div className="flex items-center gap-2 text-[#ffd700]">
                            🎯 叫分阶段
                        </div>
                        {currentTurn !== null && (
                            <div className="text-sm font-normal text-gray-200">
                                {currentTurn === bottomPlayer?.seatId ? (
                                    '轮到你叫分'
                                ) : (
                                    <span className="flex items-center gap-2">
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
                <AnimatePresence> {/* Issue #47 Problem 4: Removed mode="wait" to prevent flickering */}
                    {/* Top Player's Turn */}
                    {lastPlayedPosition === 'top' && lastPlayedCards && (
                        <motion.div
                            key="top-play"
                            initial={{ y: -20, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -20, opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="absolute top-40 left-1/2 -translate-x-1/2 z-30"
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
                            className="absolute left-40 top-1/2 -translate-y-1/2 z-30"
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
                            className="absolute right-40 top-1/2 -translate-y-1/2 z-30"
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
                            className="absolute bottom-48 left-1/2 -translate-x-1/2 z-30"
                        >
                            {renderPlayedCards(lastPlayedCards.cards)}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            {/* --- Players --- */}

            {/* TOP Player */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                {topPlayer && (
                    <PlayerAvatar
                        username={topPlayer.username}
                        avatar={topPlayer.avatar}
                        position="top"
                        handCount={getPlayerHandCount(topPlayer.seatId)}
                        isBot={topPlayer.isBot}
                        isTurn={currentTurn === topPlayer.seatId}
                        isLandlord={topPlayer.seatId === landlordSeatIndex}
                        lastBid={getLastBid(topPlayer.seatId)}
                        isThinking={topPlayer.isBot && currentTurn === topPlayer.seatId}
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
                        lastBid={getLastBid(leftPlayer.seatId)}
                        isThinking={leftPlayer.isBot && currentTurn === leftPlayer.seatId}
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
                        lastBid={getLastBid(rightPlayer.seatId)}
                        isThinking={rightPlayer.isBot && currentTurn === rightPlayer.seatId}
                    />
                )}
            </div>

            {/* BOTTOM Player (Me) */}
            <div className="absolute inset-x-0 bottom-4 px-8 flex items-end justify-between pointer-events-none z-40">

                {/* 1. Avatar (Far Left) */}
                {/* Increased z-index to 50 and margin-bottom to avoid being covered or cut off by screen edges */}
                <div className="pointer-events-auto flex-shrink-0 mb-10 relative z-50">
                    {bottomPlayer && (
                        <PlayerAvatar
                            username={bottomPlayer.username || 'Me'}
                            avatar={bottomPlayer.avatar}
                            position="bottom"
                            isBot={bottomPlayer.isBot}
                            isTurn={currentTurn === bottomPlayer.seatId}
                            isLandlord={bottomPlayer.seatId === landlordSeatIndex}
                            lastBid={getLastBid(bottomPlayer.seatId)}
                            coins={1000}
                            isThinking={bottomPlayer.isBot && currentTurn === bottomPlayer.seatId}
                        />
                    )}
                </div>

                {/* 2. Hand Cards & Controls (Centered) - Constrained width to avoid blocking sides */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex flex-col items-center mb-4 pointer-events-none" style={{ maxWidth: 'calc(100% - 280px)' }}>

                    {/* Game Control Buttons (Above Hand) - Fix Z-Index issue */}
                    <div className="mb-6 flex gap-6 pointer-events-auto items-center min-h-[60px] relative z-50">
                        {/* BIDDING Phase Buttons */}
                        {phase === 'BIDDING' && currentTurn === bottomPlayer?.seatId && (
                            <AnimatePresence>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex items-center gap-6"
                                >
                                    {/* Timer Badge (Consistent Design) */}
                                    <div className="relative w-16 h-16 rounded-full bg-[#1a1a1a] border-2 border-[#ffd700] flex flex-col items-center justify-center shadow-lg shadow-black/50">
                                        <div className="text-[#ffd700] text-2xl font-bold leading-none mt-1">{remainingTime}</div>
                                        <div className="text-[#ffd700] text-[8px] font-bold tracking-widest mt-0.5">SEC</div>
                                    </div>

                                    {/* Pass Button */}
                                    <motion.button
                                        onClick={() => handleBid(0)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="h-8 px-6 rounded-full font-bold text-white shadow-lg border border-white/10 text-sm"
                                        style={{ background: 'linear-gradient(to bottom, #4b5563, #1f2937)' }}
                                    >
                                        Pass
                                    </motion.button>

                                    {/* Bid Buttons */}
                                    {[1, 2, 3].map(bid => (
                                        <motion.button
                                            key={bid}
                                            onClick={() => highestBid < bid && handleBid(bid)}
                                            disabled={highestBid >= bid}
                                            whileHover={highestBid < bid ? { scale: 1.05 } : {}}
                                            whileTap={highestBid < bid ? { scale: 0.95 } : {}}
                                            className={`h-8 px-6 rounded-full font-bold text-white shadow-lg border border-white/20 transition-all text-sm ${highestBid >= bid ? 'opacity-50 cursor-not-allowed grayscale' : ''
                                                }`}
                                            style={{
                                                background: bid === 1
                                                    ? 'linear-gradient(to bottom, #d97706, #92400e)' // Bronze/Orange
                                                    : bid === 2
                                                        ? 'linear-gradient(to bottom, #9ca3af, #4b5563)' // Silver
                                                        : 'linear-gradient(to bottom, #fbbf24, #b45309)' // Gold
                                            }}
                                        >
                                            {bid === 1 ? '1 Point' : bid === 2 ? '2 Points' : '3 Points'}
                                        </motion.button>
                                    ))}
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
                                    className="flex items-center gap-6"
                                >
                                    {currentTurn === bottomPlayer?.seatId && (
                                        <>
                                            {/* Timer */}
                                            <div className="relative w-16 h-16 rounded-full bg-[#1a1a1a] border-2 border-[#ffd700] flex flex-col items-center justify-center shadow-lg shadow-black/50">
                                                <div className="text-[#ffd700] text-2xl font-bold leading-none mt-1">{remainingTime}</div>
                                                <div className="text-[#ffd700] text-[8px] font-bold tracking-widest mt-0.5">SEC</div>
                                            </div>

                                            <motion.button
                                                onClick={handlePass}
                                                disabled={!canPass}
                                                whileHover={canPass ? { scale: 1.05 } : {}}
                                                whileTap={canPass ? { scale: 0.95 } : {}}
                                                className={`h-8 px-6 rounded-full font-bold text-white shadow-lg border border-white/10 text-sm ${!canPass ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                style={{ background: 'linear-gradient(to bottom, #4b5563, #1f2937)' }}
                                            >
                                                Pass
                                            </motion.button>

                                            <motion.button
                                                onClick={handleHint}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="h-8 px-6 rounded-full font-bold text-white shadow-lg border border-white/10 text-sm"
                                                style={{ background: 'linear-gradient(to bottom, #059669, #065f46)' }}
                                            >
                                                Hint
                                            </motion.button>

                                            <motion.button
                                                onClick={handlePlay}
                                                disabled={selectedCards.length === 0}
                                                whileHover={selectedCards.length > 0 ? { scale: 1.05 } : {}}
                                                whileTap={selectedCards.length > 0 ? { scale: 0.95 } : {}}
                                                className={`h-8 px-8 rounded-full font-bold text-white shadow-lg border border-white/10 text-sm ${selectedCards.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                style={{ background: 'linear-gradient(to bottom, #2563eb, #1e40af)' }}
                                            >
                                                Play
                                            </motion.button>
                                        </>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Hand Cards */}
                    <div className="w-full flex justify-center pointer-events-auto">
                        <PlayerHand
                            cards={handCards}
                            isHuman={true}
                            onCardClick={handleCardClick}
                            onSelectionChange={handleSelectionChange}
                            className="" // Issue #44: Removed scale transform to fix click area offset
                        />
                    </div>
                </div>

                {/* 3. Chat Button (Far Right) */}
                <div className="pointer-events-auto flex-shrink-0 mb-6">
                    <button
                        className="flex items-center gap-2 bg-[#1f2937]/90 hover:bg-[#374151] text-[#9ca3af] px-5 py-2 rounded-full border border-gray-600 transition-all shadow-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <span className="text-sm font-medium">Chat</span>
                    </button>
                </div>
            </div>

        </div>
    );
};
