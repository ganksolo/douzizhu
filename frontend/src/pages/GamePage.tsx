import { useEffect } from 'react';
import { useRoomStore } from '../store/room.store';
import { useGameStore } from '../store/game.store';
import { SocketService } from '../services/socket';
import { GameBoard } from '../components/game/GameBoard';

// --- Game Page ---
export const GamePage = () => {
    // Stores
    const setMySeatId = useGameStore((state) => state.setMySeatId);
    const setSyncState = useGameStore((state) => state.setSyncState);

    // Initialize Game Store Seat
    const myRoomSeat = useRoomStore((state) => state.mySeatId);

    useEffect(() => {
        // Sync mySeatId from RoomStore to GameStore
        console.log('[GamePage] mySeatId sync:', { myRoomSeat });
        if (myRoomSeat !== null && myRoomSeat !== undefined) {
            setMySeatId(myRoomSeat);
        }
    }, [myRoomSeat, setMySeatId]);

    // Socket Listener for Game State
    useEffect(() => {
        const handleSyncState = (data: any) => {
            setSyncState(data);
        };

        SocketService.on('sync_state', handleSyncState);
        return () => {
            SocketService.off('sync_state', handleSyncState);
        };
    }, [setSyncState]);

    return (
        <div className="w-full h-screen relative bg-black">
            {/* Main Game Board (includes Debug Panel) */}
            <GameBoard />
        </div>
    );
};
