import { Test, TestingModule } from '@nestjs/testing';
import { PlayingState } from './playing.state';
import { AIService } from '../../services/ai.service';
import { RulesService } from '../../services/rules.service';
import { GameContext } from '../game-context';
import { ActionType } from '../../types/game.types';

describe('PlayingState (Phase 17.3 AI Integration)', () => {
    let state: PlayingState;
    let aiService: AIService;
    let rulesService: RulesService;
    let mockContext: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlayingState,
                {
                    provide: AIService,
                    useValue: {
                        scheduleTurn: jest.fn()
                    }
                },
                {
                    provide: RulesService,
                    useValue: {
                        validateMove: jest.fn().mockReturnValue({ isValid: true }),
                        analyze: jest.fn()
                    }
                }
            ],
        }).compile();

        state = module.get<PlayingState>(PlayingState);
        aiService = module.get<AIService>(AIService);
        rulesService = module.get<RulesService>(RulesService);

        mockContext = {
            roomData: {
                players: [
                    { id: 'p1', isRobot: false, hand: ['3S'], handCount: 1 },
                    { id: 'p2', isRobot: true, hand: ['4S'], handCount: 1 }
                ],
                currentTurn: 'p1',
                isAIThinking: false,
                lastPlayedCards: null
            },
            handleInput: jest.fn()
        };
    });

    it('should NOT trigger AI if current turn is human', () => {
        state.update(mockContext, 0);
        expect(aiService.scheduleTurn).not.toHaveBeenCalled();
        expect(mockContext.roomData.isAIThinking).toBe(false);
    });

    it('should trigger AI if current turn is robot and not thinking', () => {
        mockContext.roomData.currentTurn = 'p2'; // Robot
        state.update(mockContext, 0);

        expect(mockContext.roomData.isAIThinking).toBe(true);
        expect(aiService.scheduleTurn).toHaveBeenCalledWith(mockContext, 'p2');
    });

    it('should NOT trigger AI if already thinking', () => {
        mockContext.roomData.currentTurn = 'p2'; // Robot
        mockContext.roomData.isAIThinking = true;

        state.update(mockContext, 0);

        expect(aiService.scheduleTurn).not.toHaveBeenCalled();
    });

    it('should reset isAIThinking when turn advances', () => {
        // Setup: Robot turn, thinking
        mockContext.roomData.currentTurn = 'p2';
        mockContext.roomData.isAIThinking = true;

        // Action: Robot plays
        const action = { playerId: 'p2', type: ActionType.PLAY, payload: ['4S'] };
        state.handleInput(mockContext, action);

        // Expect: Turn advanced to p1, thinking reset
        expect(mockContext.roomData.currentTurn).toBe('p1');
        expect(mockContext.roomData.isAIThinking).toBe(false);
    });
});
