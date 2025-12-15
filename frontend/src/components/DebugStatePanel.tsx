import { useGameStore } from '../store/game.store';
import { useRoomStore } from '../store/room.store';

// Issue #48 Problem 4: Enhanced Debug Panel
// Helper to convert card value to string representation
const cardValueToString = (val: number): string => {
    if (val === 52) return 'BJ';
    if (val === 53) return 'RJ';
    const suits = ['♦', '♣', '♥', '♠'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const suitIndex = Math.floor(val / 13);
    const rankIndex = val % 13;
    return suits[suitIndex] + ranks[rankIndex];
};

interface DebugStatePanelProps {
    selectedCards?: number[];
    canPass?: boolean;
}

export const DebugStatePanel = ({ selectedCards = [], canPass = false }: DebugStatePanelProps) => {
    const mySeatId = useGameStore((state) => state.mySeatId);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const phase = useGameStore((state) => state.phase);
    const lastPlayedCards = useGameStore((state) => state.lastPlayedCards);
    const myHand = useGameStore((state) => state.myHand);
    const players = useGameStore((state) => state.players);
    const landlordSeatIndex = useGameStore((state) => state.landlordSeatIndex);
    const getRelativeSeat = useGameStore((state) => state.getRelativeSeat);
    const roomPlayers = useRoomStore((state) => state.players);

    // Helper to get direction text for turn
    const getTurnDirection = () => {
        if (currentTurn === null) return '-';
        return getRelativeSeat(currentTurn).toUpperCase();
    };

    // Get current turn player info
    const currentPlayer = players.find(p => p.seatIndex === currentTurn);
    const currentPlayerName = currentPlayer?.username || roomPlayers.find(p => p.seatId === currentTurn)?.username || '-';

    // Format last played cards
    const lastPlayStr = lastPlayedCards?.cards.map(cardValueToString).join(' ') || '-';

    return (
        <div className="fixed top-4 right-4 z-50 bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs shadow-xl border border-green-900 pointer-events-none select-none min-w-[250px] max-w-[300px]">
            <h3 className="text-white font-bold border-b border-gray-600 mb-2 pb-1">🐛 DEBUG PANEL</h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-gray-400">Phase:</span>
                <span className="text-white font-bold">{phase}</span>

                <span className="text-gray-400">My Seat:</span>
                <span className="text-yellow-300">{mySeatId ?? 'N/A'}</span>

                <span className="text-gray-400">Turn:</span>
                <span className="text-cyan-300">
                    {currentTurn ?? '-'} ({getTurnDirection()})
                </span>

                <span className="text-gray-400">Turn Player:</span>
                <span className="text-cyan-300 truncate">{currentPlayerName}</span>

                <span className="text-gray-400">Can Pass:</span>
                <span className={canPass ? 'text-green-400' : 'text-red-400'}>{canPass ? 'YES' : 'NO'}</span>

                <span className="text-gray-400">Selected:</span>
                <span className="text-pink-300">{selectedCards.length} cards</span>

                <span className="text-gray-400">My Hand:</span>
                <span className="text-yellow-300">{myHand.length} cards</span>

                <span className="text-gray-400">Landlord:</span>
                <span className="text-red-400">
                    {landlordSeatIndex !== null ? `S${landlordSeatIndex} (${getRelativeSeat(landlordSeatIndex).toUpperCase()})` : '-'}
                </span>
            </div>

            {/* Last Played Cards - Full Display */}
            <div className="mt-2 pt-2 border-t border-gray-700">
                <span className="text-gray-400">Last Play:</span>
                <div className="text-orange-300 break-words">
                    {lastPlayedCards ? (
                        <>S{lastPlayedCards.seatIndex}: {lastPlayStr}</>
                    ) : (
                        'None'
                    )}
                </div>
            </div>

            {/* Players Overview */}
            <div className="mt-2 pt-2 border-t border-gray-700">
                <span className="text-gray-400 text-[10px]">Players:</span>
                <div className="text-[10px] mt-1 space-y-0.5">
                    {players.map(p => (
                        <div key={p.seatIndex} className="flex justify-between">
                            <span className={p.seatIndex === landlordSeatIndex ? 'text-red-400' : 'text-gray-300'}>
                                {getRelativeSeat(p.seatIndex).toUpperCase()}: {p.username?.slice(0, 8) || 'Bot'}
                                {p.seatIndex === landlordSeatIndex && ' 👑'}
                            </span>
                            <span className="text-blue-300">{p.handCount} cards</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
