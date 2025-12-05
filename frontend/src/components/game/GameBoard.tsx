import { useGameStore } from '../../store/game.store';
import { useRoomStore } from '../../store/room.store';
import { PlayerAvatar } from './PlayerAvatar';
import { Card } from './Card';
import { useState } from 'react';

// --- Card Logic Helpers ---
const getCardData = (value: number) => {
    // 0-51: Regular cards
    // 52: Black Joker
    // 53: Red Joker
    if (value === 52) return { suit: 'joker_black', rank: 'Joker', color: 'black' };
    if (value === 53) return { suit: 'joker_red', rank: 'Joker', color: 'red' };

    const suits = ['diamonds', 'clubs', 'hearts', 'spades'] as const;
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

    const suitIndex = Math.floor(value / 13);
    const rankIndex = value % 13;

    return {
        suit: suits[suitIndex],
        rank: ranks[rankIndex]
    };
};

export const GameBoard = () => {
    // Stores
    const roomPlayers = useRoomStore((state) => state.players);
    const getRelativeSeat = useGameStore((state) => state.getRelativeSeat);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const bottomCards = useGameStore((state) => state.bottomCards);
    const lastPlayed = useGameStore((state) => state.lastPlayed);
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

    const toggleCardSelection = (cardValue: number) => {
        if (selectedCards.includes(cardValue)) {
            setSelectedCards(selectedCards.filter(c => c !== cardValue));
        } else {
            setSelectedCards([...selectedCards, cardValue]);
        }
    };

    // --- Table Area Rendering ---
    // If lastPlayed exists, determine its relative position to show visually on table
    const lastPlayedPosition = lastPlayed ? getRelativeSeat(lastPlayed.seatIndex) : null;

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
                            {renderPlayedCards(lastPlayed!.cards)}
                        </div>
                    )}

                    {/* Left Player's Turn */}
                    {lastPlayedPosition === 'left' && (
                        <div className="absolute left-10 top-1/2 -translate-y-1/2">
                            {renderPlayedCards(lastPlayed!.cards)}
                        </div>
                    )}

                    {/* Right Player's Turn */}
                    {lastPlayedPosition === 'right' && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2">
                            {renderPlayedCards(lastPlayed!.cards)}
                        </div>
                    )}

                    {/* Bottom Player's Turn (My last play) */}
                    {lastPlayedPosition === 'bottom' && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                            {renderPlayedCards(lastPlayed!.cards)}
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

                {/* My Hand Cards */}
                <div className="flex -space-x-12 h-36 items-end hover:items-start transition-all pt-8">
                    {myHand.map((val, i) => {
                        const data = getCardData(val);
                        const isSelected = selectedCards.includes(val);
                        return (
                            <div key={i} className="hover:-translate-y-6 transition-transform duration-200 z-10 hover:z-20">
                                <Card
                                    suit={data.suit as any}
                                    rank={data.rank}
                                    isSelected={isSelected}
                                    onClick={() => toggleCardSelection(val)}
                                />
                            </div>
                        );
                    })}
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

                    <div className="flex gap-4">
                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            Play
                        </button>
                        <button className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-full font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            Pass
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
