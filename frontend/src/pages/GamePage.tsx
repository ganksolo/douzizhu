import { useEffect } from 'react';
import { useRoomStore } from '../store/room.store';
import { useGameStore } from '../store/game.store';
import { SocketService } from '../services/socket';
import { DebugStatePanel } from '../components/DebugStatePanel';
import { GameBoard } from '../components/game/GameBoard';

// --- Game Page ---
export const GamePage = () => {
    // Stores
    const setMySeatId = useGameStore((state) => state.setMySeatId);
    const setSyncState = useGameStore((state) => state.setSyncState);

    // Initialize Game Store Seat
    useEffect(() => {
        // Sync mySeatId from RoomStore to GameStore
        const myRoomSeat = useRoomStore.getState().mySeatId;
        if (myRoomSeat !== null && myRoomSeat !== undefined) {
            setMySeatId(myRoomSeat);
        }
    }, [setMySeatId]);

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
            {/* Debug Panel on top of everything */}
            <DebugStatePanel />

            {/* Main Game Board */}
            <GameBoard />
        </div>
    );
};
