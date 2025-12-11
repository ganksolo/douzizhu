import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore, type RoomPlayer } from '../store/room.store';
import { SocketService } from '../services/socket';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../components/ui/useToast';
import { GamePage } from './GamePage';
import { PlayerSeat } from '../components/game/PlayerSeat';

export const RoomPage = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Store State
    const players = useRoomStore((state) => state.players);
    const roomConfig = useRoomStore((state) => state.roomConfig);
    const roomStatus = useRoomStore((state) => state.roomStatus);
    const setRoomData = useRoomStore((state) => state.setRoomData);
    const updatePlayerReady = useRoomStore((state) => state.updatePlayerReady);
    const addPlayer = useRoomStore((state) => state.addPlayer);
    const removePlayer = useRoomStore((state) => state.removePlayer);
    const setMySeatId = useRoomStore((state) => state.setMySeatId);

    // Auth State
    const currentUser = useAuthStore((state) => state.user);

    // Initial Join & Socket Setup
    useEffect(() => {
        if (!roomId || !currentUser) return;

        console.log('[Room] Connecting to room:', roomId);

        // Events
        const handlePlayerList = (data: { players: RoomPlayer[], config?: any, roomStatus?: 'waiting' | 'playing' | 'finished' }) => {
            console.log('[Room] Player list update:', data);

            // Find my seat to set perspective
            const me = data.players.find(p => p.userId === currentUser.userId);
            if (me) {
                // Support both seat and seatId properties
                const seatStr = (me as any).seat ?? me.seatId;
                if (typeof seatStr === 'number') {
                    setMySeatId(seatStr);
                }
            }

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
            toast({ message: `${player.username} joined`, type: 'info' });

            if (player.userId === currentUser.userId) {
                const seatStr = (player as any).seat ?? player.seatId;
                if (typeof seatStr === 'number') {
                    setMySeatId(seatStr);
                }
            }
        };

        const handlePlayerLeft = (data: { userId: string }) => {
            // Find name before removing for toast
            const p = useRoomStore.getState().players.find(pl => pl.userId === data.userId);
            if (p) toast({ message: `${p.username} left`, type: 'info' });

            console.log('[Room] Player left:', data.userId);
            removePlayer(data.userId);
        };

        const handleReadyUpdate = (data: { userId: string; isReady: boolean }) => {
            console.log('[Room] Ready update:', data);
            updatePlayerReady(data.userId, data.isReady);
        };

        const handleGameStart = () => {
            console.log('[Room] Game Started!');
            toast({ message: 'Game Start!', type: 'success', duration: 2000 });
            // Update store status to trigger re-render
            setRoomData({
                roomId,
                players: useRoomStore.getState().players,
                config: useRoomStore.getState().roomConfig || undefined,
                roomStatus: 'playing'
            });
        };

        const handleError = (data: { message: string }) => {
            console.error('[Room] Error:', data.message);
            toast({ title: 'Error', message: data.message, type: 'error' });
            if (data.message.includes('not found') || data.message.includes('full')) {
                navigate('/lobby');
            }
        };

        // Listeners
        SocketService.on('player_list_update', handlePlayerList);
        SocketService.on('player_joined', handlePlayerJoined);
        SocketService.on('player_left', handlePlayerLeft);
        SocketService.on('player_ready_update', handleReadyUpdate);
        SocketService.on('game_start', handleGameStart);
        SocketService.on('error', handleError);

        // Auto Join on Mount (auto-sit by default)
        SocketService.emit('join_room', { roomId });

        return () => {
            SocketService.off('player_list_update', handlePlayerList);
            SocketService.off('player_joined', handlePlayerJoined);
            SocketService.off('player_left', handlePlayerLeft);
            SocketService.off('player_ready_update', handleReadyUpdate);
            SocketService.off('game_start', handleGameStart);
            SocketService.off('error', handleError);
        };
    }, [roomId, currentUser, setRoomData, addPlayer, removePlayer, updatePlayerReady, navigate, setMySeatId, toast]);

    // Actions
    const handleToggleReady = () => {
        console.log('[RoomPage] Toggle Ready called');
        console.log('[RoomPage] Socket connected?', SocketService.getConnectionStatus());
        console.log('[RoomPage] Current user:', currentUser);
        console.log('[RoomPage] Me object:', me);
        console.log('[RoomPage] amIReady:', amIReady);
        console.log('[RoomPage] Toggling ready. Current:', amIReady, 'User:', currentUser?.userId);
        SocketService.emit('toggle_ready', { roomId, isReady: !amIReady });
        // Optimistic update
        if (currentUser) {
            updatePlayerReady(currentUser.userId, !amIReady);
        }
    };



    const handleAddBot = async () => {
        if (!roomId) return;
        try {
            // Fix Issue #18: Fill all empty seats with one click
            const result = await api.room.fillBots(roomId);
            const count = result.botsAdded;
            if (count > 0) {
                toast({ message: `Added ${count} AI player${count > 1 ? 's' : ''}!`, type: 'success' });
            } else {
                toast({ message: 'Room is already full', type: 'info' });
            }
        } catch (error: any) {
            toast({ title: 'Failed to add bots', message: error.message || 'Unknown error', type: 'error' });
        }
    };

    const handleLeave = async () => {
        if (!roomId) return;
        try {
            await api.room.leave(roomId);
            navigate('/lobby');
        } catch (error: any) {
            console.error('Leave failed, forcing nav', error);
            navigate('/lobby');
        }
    }

    // Derived State
    const me = players.find(p => p.userId === currentUser?.userId);
    const amIReady = me?.isReady || false;

    // Strict type check for PVE (Case sensitive based on Swagger/Interface) - FIXED: Now case insensitive
    const isPve = roomConfig?.type?.toUpperCase() === 'PVE';
    const maxSeats = roomConfig?.maxPlayers || 4;
    const hasEmptySeats = players.length < maxSeats;

    // --- Spatial Layout Logic (Must be before early return for hooks rules) ---
    const getPlayerByRelativePos = useRoomStore((state) => state.getPlayerByRelativePos);

    // If game is playing, render GamePage
    if (roomStatus === 'playing') {
        return <GamePage />;
    }

    // Render Logic
    const renderSeatWrapper = (pos: 'bottom' | 'right' | 'top' | 'left') => {
        const player = getPlayerByRelativePos(pos);

        // Show "Sit Here" button is no longer needed since we auto-sit
        // but keep the structure for future manual seat selection if needed
        const showSit = false;

        return (
            <PlayerSeat
                player={player}
                position={pos}
                isCurrentUser={player?.userId === currentUser?.userId}
                onSit={() => { }} // No-op since we auto-sit
                showSitButton={showSit}
            />
        );
    };

    return (
        <div className="min-h-screen bg-[rgb(50,85,66)] relative overflow-hidden flex flex-col font-sans select-none">
            {/* --- Background --- */}
            {/* Table Cloth Texture (Green dots) */}
            <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(rgb(26, 77, 51) 1px, transparent 1px)',
                backgroundSize: '4px 4px',
                backgroundColor: 'rgb(50, 85, 66)'
            }}></div>

            {/* Lighting/Vignette Overlay */}
            <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.6) 80%)'
            }}></div>

            {/* Center Pattern (Circle + Diamond) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vh] h-[60vh] opacity-20 pointer-events-none">
                <div className="absolute inset-0 rounded-full border-[10px] border-[#8dafa0]"></div>
                <div className="absolute inset-[14.6%] border-2 border-[#8dafa0] transform rotate-45"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 p-4 flex justify-between items-center text-white/80">
                <button
                    onClick={handleLeave}
                    className="flex items-center gap-2 hover:text-white transition-colors bg-red-900/20 hover:bg-red-900/40 px-3 py-1 rounded-full backdrop-blur-sm"
                >
                    <span>&larr;</span> Leave
                </button>
                <div className="font-mono bg-black/20 px-4 py-1 rounded-full backdrop-blur-sm">
                    Room: {roomId?.slice(0, 8)} | {roomConfig?.type || 'PVP'}
                </div>
                {/* PVE Controls */}
                {isPve && hasEmptySeats && (
                    <button
                        onClick={handleAddBot}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 transition-transform active:scale-95"
                    >
                        <span>🤖</span> Fill AI Players
                    </button>
                )}
            </div>

            {/* Game Table Area */}
            <div className="flex-1 relative z-10 flex items-center justify-center">
                {/* Center Table Info (Hidden/Replaced by Pattern) */}


                {/* Left Player */}
                <div className="absolute left-8 top-1/2 -translate-y-1/2 pb-16">
                    {renderSeatWrapper('left')}
                </div>

                {/* Top Player (Opposite) */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2">
                    {renderSeatWrapper('top')}
                </div>

                {/* Right Player */}
                <div className="absolute right-8 top-1/2 -translate-y-1/2 pb-16">
                    {renderSeatWrapper('right')}
                </div>

                {/* Bottom Player (Me) */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    {renderSeatWrapper('bottom')}

                    {/* Action Bar (Only for me if seated) */}
                    {me && (
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full flex justify-center gap-4 min-w-[200px]">
                            {/* Ready Button */}
                            {!amIReady ? (
                                <button
                                    onClick={handleToggleReady}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold py-3 px-10 rounded-full shadow-[0_4px_0_rgb(161,98,7)] active:shadow-none active:translate-y-1 transition-all text-xl uppercase tracking-wider"
                                >
                                    Ready
                                </button>
                            ) : (
                                <button
                                    onClick={handleToggleReady}
                                    className="bg-gray-500/50 hover:bg-gray-500/70 text-white font-bold py-2 px-6 rounded-full border border-white/20 backdrop-blur-sm transition-all"
                                >
                                    Cancel Ready
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
