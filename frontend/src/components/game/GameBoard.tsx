import { useGameStore } from '../../store/game.store';
import { useRoomStore } from '../../store/room.store';
import { PlayerAvatar } from './PlayerAvatar';
import { Card } from './Card';
import { useState, useMemo } from 'react';
import { GameControls } from './GameControls';
import { PlayerHand } from '../PlayerHand';
import { Clock } from 'lucide-react';
import type { Card as CardType } from '../../types';

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
    const getRelativeSeat = useGameStore((state) => state.getRelativeSeat);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const bottomCards = useGameStore((state) => state.bottomCards);
    const lastPlayedCards = useGameStore((state) => state.lastPlayedCards);
    const myHand = useGameStore((state) => state.myHand);
    const phase = useGameStore((state) => state.phase);

    const [selectedCards, setSelectedCards] = useState<number[]>([]);

    // Helper to get UI player
    const getUIPlayer = (position: 'bottom' | 'right' | 'top' | 'left') => {
        return roomPlayers.find(p => p.seatId !== undefined && getRelativeSeat(p.seatId) === position);
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

            {/* --- Central Area (Dipai & Table) --- */}
            <div className="absolute top-[18%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-8 w-full max-w-3xl h-[400px]">
                {/* Dipai (Bottom Cards) */}
                <div className="flex gap-2">
                    {bottomCards.length > 0 ? (
                        bottomCards.map((val, i) => {
                            const data = getCardData(val);
                            return <Card key={i} suit={data.suit as any} rank={data.rank} scale={0.6} />;
                        })
                    ) : (
                        // Hidden Dipai
                        Array(8).fill(0).map((_, i) => (
                            <Card key={i} suit="spades" rank="" scale={0.6} hidden />
                        ))
                    )}
                </div>

                {/* Table Played Cards Area (4 Quadrants) */}
                <div className="relative w-full h-full">
                    {/* Top Player's Turn */}
                    {lastPlayedPosition === 'top' && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2">
                            {renderPlayedCards(lastPlayedCards!.cards)}
                        </div>
                    )}

                    {/* Left Player's Turn */}
                    {lastPlayedPosition === 'left' && (
                        <div className="absolute left-10 top-1/2 -translate-y-1/2">
                            {renderPlayedCards(lastPlayedCards!.cards)}
                        </div>
                    )}

                    {/* Right Player's Turn */}
                    {lastPlayedPosition === 'right' && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2">
                            {renderPlayedCards(lastPlayedCards!.cards)}
                        </div>
                    )}

                    {/* Bottom Player's Turn (My last play) */}
                    {lastPlayedPosition === 'bottom' && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                            {renderPlayedCards(lastPlayedCards!.cards)}
                        </div>
                    )}
                </div>
            </div>


            {/* --- Players --- */}

            {/* TOP Player */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
                {topPlayer && (
                    <PlayerAvatar
                        username={topPlayer.username}
                        position="top"
                        handCount={17} // Sync later
                        isBot={topPlayer.isBot}
                        isTurn={currentTurn === topPlayer.seatId}
                    />
                )}
            </div>

            {/* LEFT Player */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2">
                {leftPlayer && (
                    <PlayerAvatar
                        username={leftPlayer.username}
                        position="left"
                        handCount={17}
                        isBot={leftPlayer.isBot}
                        isTurn={currentTurn === leftPlayer.seatId}
                    />
                )}
            </div>

            {/* RIGHT Player */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                {rightPlayer && (
                    <PlayerAvatar
                        username={rightPlayer.username}
                        position="right"
                        handCount={17}
                        isBot={rightPlayer.isBot}
                        isTurn={currentTurn === rightPlayer.seatId}
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
                            position="bottom"
                            isBot={bottomPlayer.isBot}
                            isTurn={currentTurn === bottomPlayer.seatId}
                        />
                    )}

                    {currentTurn === bottomPlayer?.seatId && (
                        <div className="absolute left-[34%] -top-8 flex items-center text-xs text-yellow-200 bg-yellow-900/80 px-3 py-1 rounded-full animate-pulse border border-yellow-500/30">
                            <Clock size={14} className="mr-1.5" />
                            <span className="font-mono font-bold">30s</span>
                        </div>
                    )}

                    <GameControls
                        isTurn={currentTurn === bottomPlayer?.seatId}
                        selectedCount={selectedCards.length}
                        canPass={canPass}
                        onPlay={() => console.log('Play clicked with', selectedCards)} // Placeholder
                        onPass={() => console.log('Pass clicked')} // Placeholder
                        onHint={() => console.log('Hint clicked')} // Placeholder
                    />
                </div>
            </div>

        </div>
    );
};
