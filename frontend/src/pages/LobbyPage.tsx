import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/lobby.store';
import { useAuthStore } from '../store/auth.store';


export const LobbyPage = () => {
    const navigate = useNavigate();

    // Store State
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const rooms = useLobbyStore((state) => state.rooms);
    const isLoading = useLobbyStore((state) => state.isLoading);
    const error = useLobbyStore((state) => state.error);
    const fetchRooms = useLobbyStore((state) => state.fetchRooms);
    const createRoom = useLobbyStore((state) => state.createRoom);
    const clearError = useLobbyStore((state) => state.clearError);

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
        }
    };

    // Fetch rooms on mount and auto-refresh
    useEffect(() => {
        fetchRooms();

        // Auto-refresh every 5 seconds
        const interval = setInterval(() => {
            fetchRooms();
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchRooms]);

    const handleJoinRoom = (roomId: string) => {
        console.log('[Lobby] Joining room:', roomId);

        // Emit join_room event via WebSocket - REMOVED: RoomPage handles this on mount
        // SocketService.emit('join_room', { roomId });

        // Navigate to room page
        navigate(`/room/${roomId}`);
    };

    const handleCreatePvP = async () => {
        try {
            const roomId = await createRoom({ type: 'PVP' });
            console.log('[Lobby] Created PvP room:', roomId);

            // Navigate to the new room
            navigate(`/room/${roomId}`);
        } catch (err) {
            console.error('[Lobby] Failed to create PvP room:', err);
        }
    };

    const handleCreatePvE = async () => {
        try {
            const roomId = await createRoom({ type: 'PVE', botCount: 3 });
            console.log('[Lobby] Created PvE room:', roomId);

            // Navigate to the new room
            navigate(`/room/${roomId}`);
        } catch (err) {
            console.error('[Lobby] Failed to create PvE room:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogout}
                            className="mr-2 px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                        >
                            退出
                        </button>
                        <span className="text-3xl">🃏</span>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">斗地主大厅</h1>
                            <p className="text-sm text-gray-500">{user?.username || 'Guest'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">{rooms.length}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">活跃房间</p>
                        </div>
                        {isLoading && (
                            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Error Banner */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded flex justify-between items-center">
                        <p className="text-red-700">{error}</p>
                        <button onClick={clearError} className="text-red-500 hover:text-red-700 text-xl font-bold">×</button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Room List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-lg font-bold text-gray-800">可加入的房间</h2>
                            </div>

                            <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                                {rooms.length === 0 && !isLoading && (
                                    <div className="text-center py-20">
                                        <div className="text-6xl mb-4 opacity-20">🎮</div>
                                        <p className="text-gray-400 text-lg">暂无活跃房间</p>
                                        <p className="text-gray-400 text-sm mt-2">创建一个新房间开始游戏</p>
                                    </div>
                                )}

                                {rooms.map((room) => {
                                    const isFull = room.currentPlayers === room.maxPlayers;
                                    const isPvE = (room.name || '').includes('[PvE]');

                                    return (
                                        <button
                                            key={room.roomId}
                                            onClick={() => !isFull && handleJoinRoom(room.roomId)}
                                            disabled={isFull}
                                            className={`
                                                w-full p-4 rounded-xl border-2 text-left
                                                transition-all duration-200
                                                ${isFull
                                                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                                    : 'border-gray-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 active:scale-[0.98]'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-base font-semibold text-gray-800">
                                                            {room.name}
                                                        </h3>
                                                        {isPvE ? (
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium border border-blue-200">
                                                                PVE (人机)
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium border border-orange-200">
                                                                PVP (对战)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">
                                                        房主: {(room.hostId || 'Unknown').substring(0, 8)}...
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className={`
                                                        px-4 py-2 rounded-lg font-mono text-sm font-semibold
                                                        ${isFull ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'}
                                                    `}>
                                                        {room.currentPlayers}/{room.maxPlayers}
                                                    </div>
                                                    {isFull ? (
                                                        <span className="text-red-500 font-medium text-sm">已满</span>
                                                    ) : (
                                                        <span className="text-emerald-600 font-medium text-sm">加入 →</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Create Room Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-6">创建新房间</h2>

                            <div className="space-y-3">
                                {/* PvP Button */}
                                <button
                                    onClick={handleCreatePvP}
                                    disabled={isLoading}
                                    className={`
                                        w-full p-4 rounded-xl text-left
                                        transition-all duration-200
                                        ${isLoading
                                            ? 'bg-gray-200 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95'
                                        }
                                    `}
                                >
                                    <div className="text-white">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xl">👥</span>
                                            <span className="font-bold">真人对战</span>
                                        </div>
                                        <p className="text-sm opacity-90">4人两副牌模式</p>
                                    </div>
                                </button>

                                {/* PvE Button */}
                                <button
                                    onClick={handleCreatePvE}
                                    disabled={isLoading}
                                    className={`
                                        w-full p-4 rounded-xl text-left
                                        transition-all duration-200
                                        ${isLoading
                                            ? 'bg-gray-200 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 active:scale-95'
                                        }
                                    `}
                                >
                                    <div className="text-white">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xl">🤖</span>
                                            <span className="font-bold">单人练习</span>
                                        </div>
                                        <p className="text-sm opacity-90">3个AI陪练</p>
                                    </div>
                                </button>
                            </div>

                            {/* Info Box */}
                            <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-600 flex items-start gap-2">
                                    <span className="text-base">💡</span>
                                    <span>房间列表每5秒自动刷新</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
