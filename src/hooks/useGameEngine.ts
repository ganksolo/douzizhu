/**
 * useGameEngine - React Hook for Game State Machine Integration
 * Bridges the gap between the state machine and React components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createGameContext } from '../engine/StateMachine/StateFactory';
import { eventBus, GameEvent, type GameEventData } from '../engine/EventBus';
import { GameStateEnum } from '../engine/GameStateEnum';
import type { AnyGameAction } from '../engine/GameAction';
import type { GameContext } from '../engine/StateMachine/GameContext';
import type { Player, Card } from '../types';

interface GameEngineState {
    currentState: GameStateEnum;
    players: Player[];
    bottomCards: Card[];
    currentTurn: number;
    landlordId: string | null;
    lastPlayedCards: { playerId: string; cards: Card[]; type: any } | null;
    winnerId: string | null;
    cardsDealt: number;
    bids: Record<string, number>;
}

/**
 * Hook to integrate game engine with React
 */
export function useGameEngine() {
    const contextRef = useRef<GameContext | null>(null);

    // React state synchronized with game engine
    const [engineState, setEngineState] = useState<GameEngineState>({
        currentState: GameStateEnum.INIT,
        players: [],
        bottomCards: [],
        currentTurn: 0,
        landlordId: null,
        lastPlayedCards: null,
        winnerId: null,
        cardsDealt: 0,
        bids: {},
    });

    // Initialize game context once
    useEffect(() => {
        if (!contextRef.current) {
            const context = createGameContext();
            contextRef.current = context;

            // Start update loop
            context.startUpdateLoop();

            console.log('[useGameEngine] Game context initialized');
        }

        return () => {
            // Cleanup on unmount
            if (contextRef.current) {
                contextRef.current.stopUpdateLoop();
                console.log('[useGameEngine] Game context cleaned up');
            }
        };
    }, []);

    // Subscribe to state changes
    useEffect(() => {
        const handleStateChange = (data: GameEventData['STATE_CHANGE']) => {
            console.log('[useGameEngine] State changed:', data.from, '→', data.to);

            // Sync engine state to React state
            if (contextRef.current) {
                setEngineState({
                    currentState: contextRef.current.getCurrentState(),
                    players: [...contextRef.current.data.players],
                    bottomCards: [...contextRef.current.data.bottomCards],
                    currentTurn: contextRef.current.data.currentTurn,
                    landlordId: contextRef.current.data.landlordId,
                    lastPlayedCards: contextRef.current.data.lastPlayedCards,
                    winnerId: contextRef.current.data.winnerId,
                    cardsDealt: 0, // Will be updated by CARD_DEALT event
                    bids: { ...contextRef.current.data.bids },
                });
            }
        };

        const handleCardDealt = (data: GameEventData['CARD_DEALT']) => {
            setEngineState(prev => ({
                ...prev,
                cardsDealt: data.cardCount,
            }));
        };

        const handleTurnChange = (_data: GameEventData['TURN_CHANGE']) => {
            if (contextRef.current) {
                setEngineState(prev => ({
                    ...prev,
                    currentTurn: contextRef.current!.data.currentTurn,
                }));
            }
        };

        eventBus.on(GameEvent.STATE_CHANGE, handleStateChange);
        eventBus.on(GameEvent.CARD_DEALT, handleCardDealt);
        eventBus.on(GameEvent.TURN_CHANGE, handleTurnChange);

        return () => {
            eventBus.off(GameEvent.STATE_CHANGE, handleStateChange);
            eventBus.off(GameEvent.CARD_DEALT, handleCardDealt);
            eventBus.off(GameEvent.TURN_CHANGE, handleTurnChange);
        };
    }, []);

    // Dispatch action to game engine
    const dispatch = useCallback((action: AnyGameAction) => {
        if (contextRef.current) {
            contextRef.current.dispatch(action);
        } else {
            console.error('[useGameEngine] Cannot dispatch - context not initialized');
        }
    }, []);

    // Helper: Start game
    const startGame = useCallback(() => {
        if (contextRef.current) {
            contextRef.current.changeState(GameStateEnum.INIT);
        }
    }, []);

    return {
        // State
        ...engineState,

        // Actions
        dispatch,
        startGame,

        // Direct access to context (for advanced use)
        context: contextRef.current,
    };
}
