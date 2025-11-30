import { Test, TestingModule } from '@nestjs/testing';
import { GameEndState } from './game-end.state';
import { MatchService } from '../../services/match.service';
import { GameContext } from '../game-context';

describe('GameEndState (Phase 19.2 Unit Tests)', () => {
    let state: GameEndState;
    let matchService: MatchService;
    let mockContext: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameEndState,
                {
                    provide: MatchService,
                    useValue: {
                        saveMatchResult: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        state = module.get<GameEndState>(GameEndState);
        matchService = module.get<MatchService>(MatchService);

        mockContext = {
            roomData: {
                roomId: 'room-1',
                players: [
                    { id: 'p1', hand: [] }, // Winner
                    { id: 'p2', hand: ['♠3'] }
                ],
                startTime: new Date(),
                actionHistory: [],
                lastPlayedCards: {}
            }
        };
    });

    it('should determine winner and trigger saveMatchResult on enter', async () => {
        await state.enter(mockContext);

        expect(matchService.saveMatchResult).toHaveBeenCalledWith(
            mockContext.roomData,
            'p1',
            expect.any(Date)
        );
    });

    it('should handle missing winner gracefully', async () => {
        mockContext.roomData.players[0].hand = ['♠3']; // No one has 0 cards

        await state.enter(mockContext);

        expect(matchService.saveMatchResult).not.toHaveBeenCalled();
    });

    it('should clear temp data on exit', () => {
        state.exit(mockContext);

        expect(mockContext.roomData.actionHistory).toEqual([]);
        expect(mockContext.roomData.lastPlayedCards).toBeUndefined();
        expect(mockContext.roomData.startTime).toBeUndefined();
    });
});
