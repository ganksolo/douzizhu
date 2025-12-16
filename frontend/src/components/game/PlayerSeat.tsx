import type { RoomPlayer } from '../../store/room.store';

interface PlayerSeatProps {
    player?: RoomPlayer;
    position: 'bottom' | 'right' | 'top' | 'left';
    isCurrentUser?: boolean;
    onSit?: () => void;
    showSitButton?: boolean;
}

export const PlayerSeat = ({ player, position, isCurrentUser, onSit, showSitButton }: PlayerSeatProps) => {
    // Empty Seat State
    if (!player) {
        return (
            <div className={`
                w-32 h-44 border-2 border-dashed border-gray-300/50 rounded-xl flex flex-col items-center justify-center gap-2
                bg-gray-900/10 backdrop-blur-sm transition-all
                ${position === 'bottom' ? 'mb-8' : ''}
                ${position === 'right' ? 'mr-8' : ''}
                ${position === 'top' ? 'mt-8' : ''}
                ${position === 'left' ? 'ml-8' : ''}
                ${showSitButton ? 'hover:bg-green-500/20 hover:border-green-400 cursor-pointer' : ''}
            `}
                onClick={showSitButton ? onSit : undefined}
            >
                {showSitButton ? (
                    <>
                        <span className="text-4xl text-green-300 opacity-80">+</span>
                        <span className="text-green-200 font-bold">Sit Here</span>
                    </>
                ) : (
                    <span className="text-gray-400 text-sm">Empty</span>
                )}
            </div>
        );
    }

    // Determine readiness logic (Frontend Visual)
    // Bots are always ready visually in PVE, real players use their status
    const isBotReady = player.isBot; // Simplified, generally bots are ready
    const displayReady = player.isReady || isBotReady;

    return (
        <div className={`
            relative flex flex-col items-center gap-3 transition-all
            ${position === 'bottom' ? 'mb-8 scale-110' : ''}
            ${position === 'right' ? 'mr-8' : ''}
            ${position === 'top' ? 'mt-8' : ''}
            ${position === 'left' ? 'ml-8' : ''}
        `}>
            {/* Ready Status Bubble */}
            {displayReady && (
                <div className="absolute -top-4 right-0 z-10 bg-green-500 text-white p-1 rounded-full shadow-lg border-2 border-white animate-bounce-short">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            {/* Avatar */}
            <div className={`
                w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden bg-white relative
                ${displayReady ? 'border-green-500' : 'border-gray-300'}
                ${player.isBot ? 'ring-4 ring-blue-300/50' : ''}
                ${isCurrentUser ? 'ring-2 ring-yellow-400' : ''}
            `}>
                {player.isBot ? (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center text-4xl">
                        🤖
                    </div>
                ) : (
                    <img
                        src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                        alt={player.username}
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Offline Overlay */}
                {player.online === false && !player.isBot && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-xs text-white font-bold px-1 py-0.5 bg-gray-700 rounded">OFFLINE</span>
                    </div>
                )}
            </div>

            {/* Name & Badge */}
            <div className="text-center">
                <div className={`
                    backdrop-blur text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-2
                    ${isCurrentUser ? 'bg-yellow-600/90' : 'bg-gray-800/80'}
                `}>
                    <span className="max-w-[80px] truncate">{player.username}</span>
                    {player.isBot && <span className="text-[10px] bg-blue-500 px-1 rounded uppercase">AI</span>}
                </div>
                {/* Coins Display */}
                {player.coins !== undefined && (
                    <div className="mt-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-yellow-500/30 flex items-center gap-1">
                        <span className="text-yellow-400 text-xs">💰</span>
                        <span className="text-yellow-200 text-xs font-mono font-bold">{player.coins.toLocaleString()}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
