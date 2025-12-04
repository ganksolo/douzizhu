import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRoomStore } from '../store/room.store';
import { useAuthStore } from '../store/auth.store';
import { SocketService } from '../services/socket';

export const RoomPage = () => {
    const { roomId } = useParams<{ roomId: string }>();

    // Store State
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const players = useRoomStore((state) => state.players);
    const roomStatus = useRoomStore((state) => state.roomStatus);
    const setRoomData = useRoomStore((state) => state.setRoomData);
    const addPlayer = useRoomStore((state) => state.addPlayer);
    const removePlayer = useRoomStore((state) => state.removePlayer);
    const updatePlayerReady = useRoomStore((state) => state.updatePlayerReady);

    // Local State
    const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');

    useEffect(() => {
        if (!roomId || !token || !user) return;

        // 1. Ensure Socket Connection
        if (!SocketService.getConnectionStatus()) {
            console.log('[RoomPage] Connecting socket...');
            SocketService.connect(token);
        }

        // 2. Join Room
        console.log(`[RoomPage] Joining room ${roomId}...`);
        SocketService.emit('join_room', { roomId });
        setConnectionStatus('Joined Room');

        // 3. Event Listeners
        const handlePlayerListUpdate = (data: any) => {
            console.log('[RoomPage] Player list update:', data);
            setRoomData(data);
        };

        const handlePlayerJoined = (data: any) => {
            console.log('[RoomPage] Player joined:', data);
            addPlayer({
                userId: data.userId,
                username: data.username,
                isReady: false,
                seat: -1, // Will be updated by full list update
                avatar: '',
                online: true
            });
        };

        const handlePlayerLeft = (data: any) => {
            console.log('[RoomPage] Player left:', data);
            removePlayer(data.userId);
        };

        const handleGameStart = (data: any) => {
            console.log('[RoomPage] Game Started!', data);
            alert('Game Started! (Transition to Game View)');
            // TODO: Transition to Game View
        };

        const handleError = (data: any) => {
            console.error('[RoomPage] Error:', data);
            alert(`Error: ${data.message}`);
        };

        SocketService.on('player_list_update', handlePlayerListUpdate);
        SocketService.on('player_joined', handlePlayerJoined);
        SocketService.on('player_left', handlePlayerLeft);
        SocketService.on('game_start', handleGameStart);
        SocketService.on('error', handleError);

        // Cleanup
        return () => {
            console.log('[RoomPage] Cleaning up...');
            SocketService.off('player_list_update', handlePlayerListUpdate);
            SocketService.off('player_joined', handlePlayerJoined);
            SocketService.off('player_left', handlePlayerLeft);
            SocketService.off('game_start', handleGameStart);
            SocketService.off('error', handleError);
            // Optional: Leave room on unmount? 
            // SocketService.emit('leave_room', { roomId });
            // For now, we keep connection alive unless explicitly logged out
        };
    }, [roomId, token, user, setRoomData, addPlayer, removePlayer]);

    const handleToggleReady = () => {
        if (!roomId || !user) return;

        const myPlayer = players.find(p => p.userId === user.userId);
        const newReadyState = !myPlayer?.isReady;

        console.log(`[RoomPage] Toggling ready to ${newReadyState}`);
        SocketService.emit('toggle_ready', { roomId, isReady: newReadyState });

        // Optimistic update
        updatePlayerReady(user.userId, newReadyState);
    };

    const myPlayer = players.find(p => p.userId === user?.userId);

    return (
        <div className="min-h-screen bg-green-800 p-8 text-white">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 bg-green-900 p-4 rounded-lg shadow-lg">
                    <div>
                        <h1 className="text-2xl font-bold">Room: {roomId}</h1>
                        <p className="text-sm text-green-300">Status: {roomStatus}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono">{connectionStatus}</p>
                        <p className="text-sm">Players: {players.length}/3</p>
                    </div>
                </div>

                {/* Player List */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {players.map((player) => (
                        <div
                            key={player.userId}
                            className={`bg-green-700 p-6 rounded-xl flex flex-col items-center border-2 transition-all ${player.isReady ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-transparent'
                                }`}
                        >
                            <div className="w-20 h-20 bg-green-600 rounded-full mb-4 flex items-center justify-center text-3xl border-2 border-green-500">
                                {player.avatar || '👤'}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{player.username}</h3>
                            {player.userId === user?.userId && (
                                <span className="bg-blue-500 text-xs px-2 py-1 rounded mb-2">YOU</span>
                            )}
                            <div className={`px-4 py-1 rounded-full text-sm font-bold ${player.isReady ? 'bg-yellow-400 text-green-900' : 'bg-gray-600 text-gray-300'
                                }`}>
                                {player.isReady ? 'READY' : 'WAITING'}
                            </div>
                        </div>
                    ))}

                    {/* Empty Slots */}
                    {[...Array(3 - players.length)].map((_, i) => (
                        <div key={`empty-${i}`} className="bg-green-900/50 p-6 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-green-700 opacity-50">
                            <div className="text-4xl mb-2">Waiting...</div>
                        </div>
                    ))}
                </div>

                {/* Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-green-900/90 p-6 backdrop-blur-sm border-t border-green-700">
                    <div className="max-w-4xl mx-auto flex justify-center gap-4">
                        <button
                            onClick={handleToggleReady}
                            className={`px-8 py-3 rounded-full font-bold text-xl shadow-lg transform transition hover:scale-105 active:scale-95 ${myPlayer?.isReady
                                ? 'bg-gray-500 hover:bg-gray-600 text-white'
                                : 'bg-yellow-400 hover:bg-yellow-500 text-green-900'
                                }`}
                        >
                            {myPlayer?.isReady ? 'Cancel Ready' : 'READY'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
