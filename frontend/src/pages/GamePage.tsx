import { useRoomStore } from '../store/room.store';

// --- Types (Placeholder for now, should move to types.ts) ---
interface Card {
    id: string;
    suit: string;
    rank: string;
}

// --- Components ---

// Player Hand Component
const PlayerHand = ({ cards, position }: { cards: Card[] | number, isMe: boolean, position: string }) => {
    if (typeof cards === 'number') {
        // Render Card Backs for opponents
        return (
            <div className={`flex items-center justify-center gap-1 ${position === 'left' || position === 'right' ? 'flex-col' : ''}`}>
                <div className="bg-blue-800 border-2 border-white w-10 h-14 rounded shadow-md flex items-center justify-center text-white text-xs font-bold">
                    {cards}
                </div>
            </div>
        );
    }

    // My Hand
    return (
        <div className="flex -space-x-8 hover:-space-x-4 transition-all duration-300">
            {cards.map((card, idx) => (
                <div key={card.id || idx} className="w-24 h-36 bg-white rounded-lg shadow-xl border border-gray-300 flex items-center justify-center text-xl font-bold cursor-pointer hover:-translate-y-4 transition-transform text-black relative">
                    {/* Corner Rank */}
                    <div className="absolute top-1 left-1">{card.rank}</div>
                    {/* Suit Symbol */}
                    <div className={`${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                        {card.suit === 'spades' && '♠'}
                        {card.suit === 'hearts' && '♥'}
                        {card.suit === 'clubs' && '♣'}
                        {card.suit === 'diamonds' && '♦'}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Game Page ---
export const GamePage = () => {
    const getPlayerByRelativePos = useRoomStore((state) => state.getPlayerByRelativePos);

    // Get Players by Position
    const me = getPlayerByRelativePos('bottom');
    const rightPlayer = getPlayerByRelativePos('right');
    const topPlayer = getPlayerByRelativePos('top');
    const leftPlayer = getPlayerByRelativePos('left');

    return (
        <div className="w-full h-screen bg-green-900 relative overflow-hidden flex flex-col items-center justify-center">
            {/* Table Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2f855a_0%,_#14532d_100%)] opacity-80"></div>

            {/* --- Players --- */}

            {/* TOP Player */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                {topPlayer ? (
                    <>
                        <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white mb-2 overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${topPlayer.username}`} alt="AI" className="w-full h-full" />
                        </div>
                        <div className="text-white bg-black/50 px-3 py-1 rounded-full text-sm mb-2">{topPlayer.username}</div>
                        <PlayerHand cards={17} isMe={false} position="top" />
                    </>
                ) : <div className="text-white/50">Empty</div>}
            </div>

            {/* LEFT Player */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-row items-center gap-4">
                {leftPlayer ? (
                    <>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white mb-2 overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${leftPlayer.username}`} alt="AI" className="w-full h-full" />
                            </div>
                            <div className="text-white bg-black/50 px-3 py-1 rounded-full text-sm mb-2">{leftPlayer.username}</div>
                        </div>
                        <PlayerHand cards={17} isMe={false} position="left" />
                    </>
                ) : <div className="text-white/50">Empty</div>}
            </div>

            {/* RIGHT Player */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-row-reverse items-center gap-4">
                {rightPlayer ? (
                    <>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white mb-2 overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${rightPlayer.username}`} alt="AI" className="w-full h-full" />
                            </div>
                            <div className="text-white bg-black/50 px-3 py-1 rounded-full text-sm mb-2">{rightPlayer.username}</div>
                        </div>
                        <PlayerHand cards={17} isMe={false} position="right" />
                    </>
                ) : <div className="text-white/50">Empty</div>}
            </div>

            {/* BOTTOM Player (Me) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center w-full max-w-4xl">
                {/* Action Bar */}
                <div className="flex gap-4 mb-4">
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold shadow-lg">Play</button>
                    <button className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-full font-bold shadow-lg">Pass</button>
                </div>

                {/* Hand Cards */}
                {me ? (
                    <PlayerHand
                        cards={[
                            { id: '1', suit: 'spades', rank: 'A' },
                            { id: '2', suit: 'hearts', rank: 'K' },
                            { id: '3', suit: 'clubs', rank: '10' },
                            { id: '4', suit: 'diamonds', rank: '5' },
                            { id: '5', suit: 'spades', rank: '3' }
                        ]}
                        isMe={true}
                        position="bottom"
                    />
                ) : (
                    <div>Loading my data...</div>
                )}

                <div className="flex items-center gap-3 mt-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-400 border-4 border-white overflow-hidden shadow-xl">
                        {/* My Avatar */}
                    </div>
                    <span className="text-white font-bold text-xl drop-shadow-md">You</span>
                </div>
            </div>

        </div>
    );
};
