import { Test, TestingModule } from '@nestjs/testing';
import { TurnManager } from './turn-manager';
import { GameContext } from './game-context';

describe('TurnManager (Phase 18.2 Turn Flow)', () => {
    let turnManager: TurnManager;
    let mockContext: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TurnManager],
        }).compile();

        turnManager = module.get<TurnManager>(TurnManager);

        mockContext = {
            roomData: {
                players: [
                    { id: 'A', name: 'Alice', hand: ['♠3'], handCount: 1 },
                    { id: 'B', name: 'Bob', hand: ['♠4'], handCount: 1 },
                    { id: 'C', name: 'Charlie', hand: ['♠5'], handCount: 1 },
                    { id: 'D', name: 'Diana', hand: ['♠6'], handCount: 1 }
                ],
                currentTurn: 'A',
                lastPlayedCards: null,
                isAIThinking: false
            }
        };
    });

    describe('FLOW-001: Normal Rotation', () => {
        it('should rotate turn clockwise (A -> B -> C -> D -> A)', () => {
            expect(mockContext.roomData.currentTurn).toBe('A');

            turnManager.nextTurn(mockContext);
            expect(mockContext.roomData.currentTurn).toBe('B');

            turnManager.nextTurn(mockContext);
            expect(mockContext.roomData.currentTurn).toBe('C');

            turnManager.nextTurn(mockContext);
            expect(mockContext.roomData.currentTurn).toBe('D');

            turnManager.nextTurn(mockContext);
            expect(mockContext.roomData.currentTurn).toBe('A');
        });

        it('should reset isAIThinking flag on each turn advance', () => {
            mockContext.roomData.isAIThinking = true;
            turnManager.nextTurn(mockContext);
            expect(mockContext.roomData.isAIThinking).toBe(false);
        });
    });

    describe('FLOW-002: Pass Logic (Free Turn)', () => {
        it('should grant free turn when all opponents pass', () => {
            // Setup: A plays cards
            mockContext.roomData.lastPlayedCards = { playerId: 'A', cards: ['♠3'] };
            mockContext.roomData.currentTurn = 'B';

            // B passes
            turnManager.handlePass(mockContext, 'B');
            expect(mockContext.roomData.currentTurn).toBe('C');
            expect(mockContext.roomData.lastPlayedCards).toBeDefined(); // Still there

            // C passes
            turnManager.handlePass(mockContext, 'C');
            expect(mockContext.roomData.currentTurn).toBe('D');
            expect(mockContext.roomData.lastPlayedCards).toBeDefined(); // Still there

            // D passes
            turnManager.handlePass(mockContext, 'D');
            expect(mockContext.roomData.currentTurn).toBe('A'); // Back to A
            expect(mockContext.roomData.lastPlayedCards).toBeUndefined(); // Cleared! Free turn
        });

        it('should NOT clear lastPlayedCards if rotation incomplete', () => {
            mockContext.roomData.lastPlayedCards = { playerId: 'A', cards: ['♠3'] };
            mockContext.roomData.currentTurn = 'B';

            // Only B passes
            turnManager.handlePass(mockContext, 'B');
            expect(mockContext.roomData.currentTurn).toBe('C');
            expect(mockContext.roomData.lastPlayedCards).toBeDefined(); // Still there
        });
    });

    describe('FLOW-003: Game End Detection', () => {
        it('should detect winner when a player has 0 cards', () => {
            mockContext.roomData.players[0].hand = [];
            mockContext.roomData.players[0].handCount = 0;

            const winner = turnManager.checkGameEnd(mockContext);
            expect(winner).toBeDefined();
            expect(winner!.id).toBe('A');
        });

        it('should return null if no player has 0 cards', () => {
            const winner = turnManager.checkGameEnd(mockContext);
            expect(winner).toBeNull();
        });
    });
});
