import { useGameStore } from '../store/game.store';

export const DebugStatePanel = () => {
    const mySeatId = useGameStore((state) => state.mySeatId);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const phase = useGameStore((state) => state.phase);
    const lastPlayed = useGameStore((state) => state.lastPlayed);
    const getRelativeSeat = useGameStore((state) => state.getRelativeSeat);

    // Helper to get direction text for turn
    const getTurnDirection = () => {
        if (currentTurn === null) return '-';
        return getRelativeSeat(currentTurn).toUpperCase();
    };

    return (
        <div className="fixed top-4 right-4 z-50 bg-black/80 text-green-400 p-4 rounded-lg font-mono text-xs shadow-xl border border-green-900 pointer-events-none select-none min-w-[200px]">
            <h3 className="text-white font-bold border-b border-gray-600 mb-2 pb-1">DEBUG PANEL</h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-gray-400">My Seat:</span>
                <span className="text-yellow-300">{mySeatId ?? 'N/A'}</span>

                <span className="text-gray-400">Phase:</span>
                <span className="text-white">{phase}</span>

                <span className="text-gray-400">Turn:</span>
                <span className="text-cyan-300">
                    {currentTurn ?? '-'} ({getTurnDirection()})
                </span>

                <span className="text-gray-400">Last Play:</span>
                <span className="text-orange-300">
                    {lastPlayed ? `S${lastPlayed.seatIndex}: [${lastPlayed.cards.length}]` : 'None'}
                </span>
            </div>

            {/* Visual helper for Turn */}
            <div className="mt-3 pt-2 border-t border-gray-700 flex justify-between text-[10px] text-center text-gray-500">
                <div>
                    L<br />{getRelativeSeat((mySeatId || 0) + 3)}
                </div>
                <div>
                    T<br />{getRelativeSeat((mySeatId || 0) + 2)}
                </div>
                <div>
                    R<br />{getRelativeSeat((mySeatId || 0) + 1)}
                </div>
            </div>
        </div>
    );
};
