import { useGameStore } from '../../store/game.store';
import { useRoomStore } from '../../store/room.store';
import { PlayerAvatar } from './PlayerAvatar';
import { Card } from './Card';
import { GameEndModal } from './GameEndModal';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { PlayerHand } from '../PlayerHand';
import { Clock } from 'lucide-react';
import type { Card as CardType } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { SocketService } from '../../services/socket';
import { useTurnTimer } from '../../hooks/useTurnTimer';
import { useNavigate } from 'react-router-dom';

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
    const bottomSeatId = bottomPlayer?.seatId;
    const isLeader = lastPlayedCards === null || (bottomSeatId !== undefined && lastPlayedCards.seatIndex === bottomSeatId);
    const canPass = !isLeader;

    // Issue #27: 判断是否轮到自己
    const isMyTurn = currentTurn === bottomPlayer?.seatId;

    // Issue #27: 超时自动执行默认动作
    const handleTimeout = useCallback(() => {
        console.log('[GameBoard] Turn timeout!');
        if (phase === 'BIDDING') {
            handleBid(0); // 自动不叫
        } else if (phase === 'PLAYING') {
            if (canPass) {
                handlePass(); // 自动不出
            }
            // 如果是 leader 不能 pass，超时暂不处理（可扩展为自动出最小牌）
        }
    }, [phase, canPass]);

    // Issue #27: 使用倒计时 Hook
    const { remainingTime } = useTurnTimer(isMyTurn, currentTurn, {
        onTimeout: handleTimeout,
        turnDuration: 30,
    });

    // --- Table Area Rendering ---
    // If lastPlayedCards exists, determine its relative position to show visually on table
    const lastPlayedPosition = lastPlayedCards ? getRelativeSeat(lastPlayedCards.seatIndex) : null;

    // --- Game Control Handlers ---
    const handlePlay = () => {
        if (selectedCards.length === 0) return;
        // Issue #33: 转换为后端期望的卡牌字符串格式
        const cardStrings = selectedCards.map(val => valueToCardString(val)).filter(s => s !== '');
        console.log('[GameBoard] Playing cards:', selectedCards, '->', cardStrings);
        SocketService.emit('client_action', {
            type: 'PLAY',
            roomId: roomId,
            payload: { cards: cardStrings }
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
        console.log('[GameBoard] Requesting hint, roomId:', roomId);
        // Issue #32: 发送 request_hint 事件到后端
        SocketService.emit('request_hint', { roomId });
    };

    const handleBid = (bidAmount: number) => {
        console.log('[GameBoard] Bidding:', bidAmount, 'roomId:', roomId);
        SocketService.emit('client_action', {
            type: 'BID',
            roomId: roomId,
            payload: { bid: bidAmount }
        });
    };

    // Issue #32: 监听 hint_result 事件
    useEffect(() => {
        const handleHintResult = (data: { cards: string[] }) => {
            console.log('[GameBoard] Hint received:', data.cards);
            if (data.cards && data.cards.length > 0) {
                // 解析卡牌字符串为数值并自动选中
                const cardValues = data.cards.map((cardStr: string) => {
                    // Backend returns card strings like "3S", "AH", "2D", "BJ", "RJ"
                    return parseCardString(cardStr);
                }).filter((v: number) => v >= 0);
                setSelectedCards(cardValues);
            } else {
                // 提示用户应该 PASS
                console.log('[GameBoard] Hint suggests PASS');
                // 可以添加 toast 提示
            }
        };

        SocketService.on('hint_result', handleHintResult);
        return () => {
            SocketService.off('hint_result', handleHintResult);
        };
    }, []);

    // Helper to render played cards
    const renderPlayedCards = (cards: number[]) => (
        <div className="flex -space-x-8 scale-75 origin-center">
            {cards.map((val, i) => {
                const data = getCardData(val);
                return <Card key={i} suit={data.suit as any} rank={data.rank} />;
            })}
        </div>
    );

    // Issue #34: 再来一局处理
    const handlePlayAgain = useCallback(() => {
        console.log('[GameBoard] Play again requested');
        resetGame();
        // 发送重新开始请求到后端
        SocketService.emit('restart_game', { roomId });
    }, [resetGame, roomId]);

    // Issue #34: 退出房间处理
    const handleExit = useCallback(() => {
        console.log('[GameBoard] Exit room requested');
        resetGame();
        resetRoom();
        navigate('/');
    }, [resetGame, resetRoom, navigate]);

    return (
        <div className="w-full h-screen bg-green-900 relative overflow-hidden flex flex-col items-center justify-center select-none">
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
                {/* Dipai (Bottom Cards) - Centered with Flat UI Style */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="flex gap-1 px-3 py-2 rounded-xl"
                    style={{
                        background: '#1a3c34',
                        border: '2px solid #2d5a4e',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.15)',
                    }}
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
                                        scale={0.85}
                                        hidden={phase === 'BIDDING' || phase === 'DEALING'}
                                    />
                                </motion.div>
                            );
                        })
                    ) : (
                        Array(8).fill(0).map((_, i) => (
                            <Card key={i} suit="spades" rank="" scale={0.85} hidden />
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
                        onCardClick={handleCardClick}
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
                            className={`absolute left-[34%] -top-10 flex items-center text-xs px-3 py-1 rounded-full border ${remainingTime <= 10
                                ? 'text-red-200 bg-red-900/80 border-red-500/30 animate-pulse'
                                : 'text-yellow-200 bg-yellow-900/80 border-yellow-500/30'
                                }`}
                        >
                            <Clock size={14} className="mr-1.5" />
                            <span className="font-mono font-bold">{remainingTime}s</span>
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
                                            className="px-4 py-1.5 rounded-lg text-white text-sm font-bold shadow-md transition-all bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 border border-gray-400/50"
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
                                    className="flex gap-2"
                                >
                                    <motion.button
                                        onClick={handlePlay}
                                        disabled={currentTurn !== bottomPlayer?.seatId || selectedCards.length === 0}
                                        whileHover={currentTurn === bottomPlayer?.seatId && selectedCards.length > 0 ? { scale: 1.05, y: -2 } : {}}
                                        whileTap={currentTurn === bottomPlayer?.seatId && selectedCards.length > 0 ? { scale: 0.95 } : {}}
                                        className={`px-4 py-1.5 rounded-lg text-white text-sm font-bold shadow-md transition-all border ${currentTurn === bottomPlayer?.seatId && selectedCards.length > 0
                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border-blue-300/50 cursor-pointer'
                                            : 'bg-gray-500/50 border-gray-400/30 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        出牌 ({selectedCards.length})
                                    </motion.button>
                                    <motion.button
                                        onClick={handleHint}
                                        disabled={currentTurn !== bottomPlayer?.seatId}
                                        whileHover={currentTurn === bottomPlayer?.seatId ? { scale: 1.05, y: -2 } : {}}
                                        whileTap={currentTurn === bottomPlayer?.seatId ? { scale: 0.95 } : {}}
                                        className={`px-4 py-1.5 rounded-lg text-white text-sm font-bold shadow-md transition-all border ${currentTurn === bottomPlayer?.seatId
                                            ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 border-green-300/50 cursor-pointer'
                                            : 'bg-gray-500/50 border-gray-400/30 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        提示
                                    </motion.button>
                                    <motion.button
                                        onClick={handlePass}
                                        disabled={currentTurn !== bottomPlayer?.seatId || !canPass}
                                        whileHover={currentTurn === bottomPlayer?.seatId && canPass ? { scale: 1.05, y: -2 } : {}}
                                        whileTap={currentTurn === bottomPlayer?.seatId && canPass ? { scale: 0.95 } : {}}
                                        className={`px-4 py-1.5 rounded-lg text-white text-sm font-bold shadow-md transition-all border ${currentTurn === bottomPlayer?.seatId && canPass
                                            ? 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 border-gray-400/50 cursor-pointer'
                                            : 'bg-gray-500/50 border-gray-400/30 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        不出
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
