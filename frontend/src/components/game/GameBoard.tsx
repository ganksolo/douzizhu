import { useGameStore } from '../../store/game.store';
import { useRoomStore } from '../../store/room.store';
import { PlayerAvatar } from './PlayerAvatar';
import { Card } from './Card';

export const GameBoard = () => {
    // Stores
    const roomPlayers = useRoomStore((state) => state.players);
    const getRelativeSeat = useGameStore((state) => state.getRelativeSeat);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const bottomCards = useGameStore((state) => state.bottomCards);
    // const phase = useGameStore((state) => state.phase);
    // const lastPlayed = useGameStore((state) => state.lastPlayed); // For Table Area later

    // Helper to get UI player
    const getUIPlayer = (position: 'bottom' | 'right' | 'top' | 'left') => {
        return roomPlayers.find(p => p.seatId !== undefined && getRelativeSeat(p.seatId) === position);
    };

    const bottomPlayer = getUIPlayer('bottom');
    const rightPlayer = getUIPlayer('right');
    const topPlayer = getUIPlayer('top');
    const leftPlayer = getUIPlayer('left');

    return (
        <div className="w-full h-screen bg-green-900 relative overflow-hidden flex flex-col items-center justify-center select-none">
            {/* Table Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2f855a_0%,_#14532d_100%)] opacity-80 pointer-events-none"></div>

            {/* --- Central Area (Dipai & Table) --- */}
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-8">
                {/* Dipai (Bottom Cards) */}
                <div className="flex gap-2">
                    {bottomCards.length > 0 ? (
                        bottomCards.map((_c, i) => (
                            // Todo: Map actual card values
                            <Card key={i} suit="spades" rank="In" scale={0.6} />
                        ))
                    ) : (
                        // Hidden Dipai
                        <>
                            <Card suit="spades" rank="" scale={0.6} hidden />
                            <Card suit="spades" rank="" scale={0.6} hidden />
                            <Card suit="spades" rank="" scale={0.6} hidden />
                            <Card suit="spades" rank="" scale={0.6} hidden />
                            <Card suit="spades" rank="" scale={0.6} hidden />
                            <Card suit="spades" rank="" scale={0.6} hidden />
                            <Card suit="spades" rank="" scale={0.6} hidden />
                            <Card suit="spades" rank="" scale={0.6} hidden />
                        </>
                    )}
                </div>

                {/* Played Cards Area (Placeholder) */}
                {/* <div className="w-64 h-32 border-2 border-white/10 rounded-lg flex items-center justify-center text-white/20">
                     Table Area
                 </div> */}
            </div>


            {/* --- Players --- */}

            {/* TOP Player */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
                {topPlayer && (
                    <PlayerAvatar
                        username={topPlayer.username}
                        position="top"
                        handCount={17}
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
                <div className="flex -space-x-12 h-36 items-end hover:items-start transition-all">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((i) => (
                        <div key={i} className="hover:-translate-y-6 transition-transform duration-200">
                            <Card suit="spades" rank={`${i}`} />
                        </div>
                    ))}
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
