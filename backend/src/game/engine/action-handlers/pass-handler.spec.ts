import { Test, TestingModule } from '@nestjs/testing';
import { PassActionHandler } from './pass-handler';
import { TurnManager } from '../turn-manager';
import { ActionType } from '../../types/game.types';

describe('PassActionHandler (Phase 18.2)', () => {
    let handler: PassActionHandler;
    let turnManager: TurnManager;
    let mockContext: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PassActionHandler, TurnManager],
        }).compile();

        handler = module.get<PassActionHandler>(PassActionHandler);
        turnManager = module.get<TurnManager>(TurnManager);

        mockContext = {
            roomData: {
                players: [
                    { id: 'A', name: 'Alice', hand: ['♠3'], handCount: 1 },
                    { id: 'B', name: 'Bob', hand: ['♠4'], handCount: 1 },
                ],
                currentTurn: 'B',
                lastPlayedCards: { playerId: 'A', cards: ['♠3'] },
                isAIThinking: false
            }
        };
    });

    describe('FLOW-004: Invalid Pass', () => {
        it('should reject PASS on free turn (no lastPlayedCards)', () => {
            mockContext.roomData.lastPlayedCards = null;
            mockContext.roomData.currentTurn = 'A';

            const action = { type: ActionType.PASS, playerId: 'A', payload: null, timestamp: Date.now() };

            expect(() => handler.handle(mockContext, action)).toThrow('Cannot pass on a free turn');
        });

        it('should reject PASS when player is the last one who played', () => {
            mockContext.roomData.lastPlayedCards = { playerId: 'A', cards: ['♠3'] };
            mockContext.roomData.currentTurn = 'A';

            const action = { type: ActionType.PASS, playerId: 'A', payload: null, timestamp: Date.now() };

            expect(() => handler.handle(mockContext, action)).toThrow('Cannot pass on a free turn');
        });
    });

    it('should reject PASS when not player turn', () => {
        const action = { type: ActionType.PASS, playerId: 'A', payload: null, timestamp: Date.now() };

        expect(() => handler.handle(mockContext, action)).toThrow('Not your turn');
    });

    it('should allow PASS when valid', () => {
        const action = { type: ActionType.PASS, playerId: 'B', payload: null, timestamp: Date.now() };

        expect(() => handler.handle(mockContext, action)).not.toThrow();
    });
});
