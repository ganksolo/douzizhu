import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore, type RoomPlayer } from '../store/room.store';
import { SocketService } from '../services/socket';
import { useAuthStore } from '../store/auth.store';

export const RoomPage = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();

    // Store State
    const players = useRoomStore((state) => state.players);
    const roomConfig = useRoomStore((state) => state.roomConfig);
    const setRoomData = useRoomStore((state) => state.setRoomData);
    const updatePlayerReady = useRoomStore((state) => state.updatePlayerReady);
    const addPlayer = useRoomStore((state) => state.addPlayer);
    const removePlayer = useRoomStore((state) => state.removePlayer);
    const currentUser = useAuthStore((state) => state.user);

    // Derived State
    const mySeatId = players.find(p => p.userId === currentUser?.userId)?.seatId;

    // Socket Events
    useEffect(() => {
        if (!roomId || !currentUser) return;

        console.log('[Room] Connecting to room:', roomId);

        // Events
        const handlePlayerList = (data: { players: RoomPlayer[], config?: any, roomStatus?: 'waiting' | 'playing' | 'finished' }) => {
            console.log('[Room] Player list update:', data);
            setRoomData({
                roomId,
                players: data.players,
                config: data.config,
                roomStatus: data.roomStatus || 'waiting'
            });
        };

        const handlePlayerJoined = (player: RoomPlayer) => {
            console.log('[Room] Player joined:', player);
            addPlayer(player);
        };

        const handlePlayerLeft = (data: { userId: string }) => {
            console.log('[Room] Player left:', data.userId);
            removePlayer(data.userId);
        };

        const handleReadyUpdate = (data: { userId: string; isReady: boolean }) => {
            console.log('[Room] Ready update:', data);
            updatePlayerReady(data.userId, data.isReady);
        };

        const handleGameStart = () => {
            console.log('[Room] Game Started!');
            alert('Game Started! (Logic to be implemented)');
            // navigate to game board or change view mode
        };

        const handleError = (data: { message: string }) => {
            console.error('[Room] Error:', data.message);
            alert(`Error: ${data.message}`);
            navigate('/lobby');
        };

        // Listeners
        SocketService.on('player_list_update', handlePlayerList);
        SocketService.on('player_joined', handlePlayerJoined);
        SocketService.on('player_left', handlePlayerLeft);
        SocketService.on('player_ready_update', handleReadyUpdate);
        SocketService.on('game_start', handleGameStart);
        SocketService.on('error', handleError);

        // Join Room
        SocketService.emit('join_room', { roomId });

        return () => {
            SocketService.off('player_list_update', handlePlayerList);
            SocketService.off('player_joined', handlePlayerJoined);
            SocketService.off('player_left', handlePlayerLeft);
            SocketService.off('player_ready_update', handleReadyUpdate);
            SocketService.off('game_start', handleGameStart);
            SocketService.off('error', handleError);
            // Don't disconnect socket here, just leave logic conceptually
        };
    }, [roomId, currentUser, setRoomData, addPlayer, removePlayer, updatePlayerReady, navigate]);

    // Handle Ready Toggle
    const handleToggleReady = () => {
        SocketService.emit('toggle_ready');
        // Optimistic update
        if (currentUser) {
            const me = players.find(p => p.userId === currentUser.userId);
            if (me) {
                updatePlayerReady(me.userId, !me.isReady);
            }
        }
    };

    // --- Spatial Layout Logic ---
    // Dou Dizhu is 3 players.
    // Fixed Positions relative to Me (Bottom):
    // If I sit at S, then (S+1)%3 is Right, (S+2)%3 is Left.
    // If I'm not seated yet (observer), just show list or default view.

    const getPlayerRole = (seatId: number | undefined): 'bottom' | 'right' | 'left' => {
        if (seatId === undefined) return 'bottom'; // Fallback
        if (mySeatId === null || mySeatId === undefined) return 'bottom'; // Observer view (todo)

        const diff = (seatId - mySeatId + 3) % 3;
        if (diff === 0) return 'bottom'; // Me
        if (diff === 1) return 'right';  // Right player
        return 'left';   // Left player (diff 2)
    };

    // Helper to render a player seat
    const renderSeat = (position: 'bottom' | 'right' | 'left') => {
        // Find player at this relative position
        const player = players.find(p => getPlayerRole(p.seatId) === position);

        // Empty seat state
        if (!player) {
            return (
                <div className={`
                    w-32 h-44 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center
                    bg-gray-50/50 backdrop-blur-sm
                    ${position === 'bottom' ? 'mb-8' : ''}
                    ${position === 'right' ? 'mr-8' : ''}
                    ${position === 'left' ? 'ml-8' : ''}
                `}>
                    <span className="text-gray-400">Empty</span>
                </div>
            );
        }

        // Logic for AI Ready State:
        // Generally backend should send isReady=true for bots.
        // Frontend Fallback: If isBot and roomConfig is PvE, treat as Ready visually if not explicitly false.
        const isBotReady = player.isBot && roomConfig?.type === 'PVE';
        const displayReady = player.isReady || isBotReady;

        return (
            <div className={`
                relative flex flex-col items-center gap-3 transition-all
                ${position === 'bottom' ? 'mb-8 scale-110' : ''}
                ${position === 'right' ? 'mr-8' : ''}
                ${position === 'left' ? 'ml-8' : ''}
            `}>
                {/* Ready Status Bubble */}
                {displayReady && (
                    <div className="absolute -top-4 right-0 z-10 bg-green-500 text-white p-1 rounded-full shadow-lg border-2 border-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}

                {/* Avatar */}
                <div className={`
                    w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden bg-white
                    ${displayReady ? 'border-green-500' : 'border-gray-300'}
                    ${player.isBot ? 'ring-4 ring-blue-200' : ''}
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
                </div>

                {/* Name & Badge */}
                <div className="text-center">
                    <div className="bg-gray-800/80 backdrop-blur text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-2">
                        {player.username}
                        {player.isBot && <span className="text-xs bg-blue-500 px-1 rounded">AI</span>}
                    </div>
                    {/* Role badge (Landlord/Peasant) would go here later */}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-green-800 relative overflow-hidden flex flex-col">
            {/* Table Surface Texture/Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#276749_0%,_#1b4332_100%)]"></div>

            {/* Header */}
            <div className="relative z-10 p-4 flex justify-between text-white/80">
                <button onClick={() => navigate('/lobby')} className="hover:text-white">← Lobby</button>
                <div className="font-mono">Room: {roomId} | {roomConfig?.type || 'PVP'}</div>
                <div>Settings</div>
            </div>

            {/* Game Table Area */}
            <div className="flex-1 relative z-10 flex items-center justify-center">
                {/* Center Table Info */}
                <div className="absolute text-center opacity-30 pointer-events-none">
                    <div className="text-6xl text-green-900 font-bold mb-2">♠♥♣♦</div>
                    <div className="text-xl text-green-100 font-serif">Dou Dizhu</div>
                </div>

                {/* Left Player */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 pb-20">
                    {renderSeat('left')}
                </div>

                {/* Right Player */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pb-20">
                    {renderSeat('right')}
                </div>

                {/* Bottom Player (Me) */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                    {renderSeat('bottom')}

                    {/* Action Bar (Only for me) */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-full flex justify-center gap-4">
                        {/* Ready Button */}
                        {!players.find(p => p.userId === currentUser?.userId)?.isReady && (
                            <button
                                onClick={handleToggleReady}
                                className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold py-3 px-8 rounded-full shadow-lg border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 transition-all"
                            >
                                READY
                            </button>
                        )}
                        {players.find(p => p.userId === currentUser?.userId)?.isReady && (
                            <button
                                onClick={handleToggleReady}
                                className="bg-gray-500/50 hover:bg-gray-500/70 text-white font-bold py-2 px-6 rounded-full border border-white/20 backdrop-blur-sm transition-all"
                            >
                                CANCEL
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
