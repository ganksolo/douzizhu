/**
 * GameEngineDemo - Demonstration component for the new State Machine architecture
 * This is a minimal example showing how to use the useGameEngine hook
 */

import { useGameEngine } from '../hooks/useGameEngine';
import { GameActionType } from '../engine/GameAction';
import { GameStateEnum } from '../engine/GameStateEnum';

export function GameEngineDemo() {
    const { currentState, players, dispatch, startGame, cardsDealt } = useGameEngine();

    const handleStartGame = () => {
        startGame();
    };

    const handleBid = (bidValue: number) => {
        const currentPlayer = players[0]; // Assuming player-0 is human
        if (currentPlayer) {
            dispatch({
                type: GameActionType.BID,
                playerId: currentPlayer.id,
                payload: { bidValue },
            });
        }
    };

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold mb-4">🎮 Game Engine v2.0 Demo</h1>

                {/* Current State Display */}
                <div className="mb-6 p-4 bg-blue-50 rounded">
                    <h2 className="text-xl font-semibold mb-2">Current State</h2>
                    <p className="text-2xl font-mono text-blue-600">{currentState}</p>
                </div>

                {/* Controls */}
                <div className="mb-6">
                    <button
                        onClick={handleStartGame}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                    >
                        Start New Game
                    </button>
                </div>

                {/* State-specific UI */}
                {currentState === GameStateEnum.DEALING && (
                    <div className="mb-6 p-4 bg-yellow-50 rounded">
                        <h3 className="text-lg font-semibold mb-2">Dealing Cards...</h3>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                                className="bg-yellow-500 h-4 rounded-full transition-all"
                                style={{ width: `${(cardsDealt / 100) * 100}%` }}
                            />
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            {cardsDealt} / 100 cards dealt
                        </p>
                    </div>
                )}

                {currentState === GameStateEnum.CALL_LANDLORD && (
                    <div className="mb-6 p-4 bg-purple-50 rounded">
                        <h3 className="text-lg font-semibold mb-2">Bidding Phase</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBid(0)}
                                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                            >
                                Pass
                            </button>
                            <button
                                onClick={() => handleBid(1)}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Bid 1
                            </button>
                            <button
                                onClick={() => handleBid(2)}
                                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                            >
                                Bid 2
                            </button>
                            <button
                                onClick={() => handleBid(3)}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                Bid 3
                            </button>
                        </div>
                    </div>
                )}

                {/* Players Info */}
                {players.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded">
                        <h3 className="text-lg font-semibold mb-2">Players</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {players.map((player, _index) => (
                                <div key={player.id} className="p-2 bg-white rounded border">
                                    <p className="font-semibold">{player.name}</p>
                                    <p className="text-sm text-gray-600">
                                        Role: {player.role} | Cards: {player.hand.length}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Documentation */}
                <div className="mt-6 p-4 bg-green-50 rounded">
                    <h3 className="text-lg font-semibold mb-2">✅ Architecture Features</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Finite State Machine with 7 states</li>
                        <li>Event-driven architecture (EventBus)</li>
                        <li>Strict validation at state level</li>
                        <li>Decoupled game logic from UI</li>
                        <li>Type-safe action dispatch</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
