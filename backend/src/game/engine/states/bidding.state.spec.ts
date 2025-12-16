
import { Test, TestingModule } from '@nestjs/testing';
import { BiddingState } from './bidding.state';
import { PlayingState } from './playing.state';
import { DealingState } from './dealing.state';
import { GameContext } from '../game-context';
import { ActionType } from '../../types/game.types';

describe('BiddingState (Timeout Logic)', () => {
    let state: BiddingState;
    let mockContext: any;
    let mockPlayingState: any;
    let mockDealingState: any;

    beforeEach(async () => {
        mockPlayingState = { name: 'playing' };
        mockDealingState = { name: 'dealing' };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BiddingState,
                { provide: PlayingState, useValue: mockPlayingState },
                { provide: DealingState, useValue: mockDealingState },
            ],
        }).compile();

        state = module.get<BiddingState>(BiddingState);

        mockContext = {
            roomData: {
                players: [
                    { id: 'p1', seatIndex: 0, name: 'P1', role: 'peasant', hand: [], handCount: 0 },
                    { id: 'p2', seatIndex: 1, name: 'P2', role: 'peasant', hand: [], handCount: 0 },
                    { id: 'p3', seatIndex: 2, name: 'P3', role: 'peasant', hand: [], handCount: 0 },
                    { id: 'p4', seatIndex: 3, name: 'P4', role: 'peasant', hand: [], handCount: 0 },
                ],
                currentTurn: 'p1',
                highestBid: 0,
                bidHistory: [],
                bottomCards: [1, 2, 3], // Dummy
                multiplier: 1,
            },
            handleInput: jest.fn(),
            transitionTo: jest.fn(),
        };
    });

    it('should randomly assign landlord when all 4 players pass', () => {
        // Stimulate 3 passes
        mockContext.roomData.bidHistory = [
            { seatIndex: 0, bid: 0 },
            { seatIndex: 1, bid: 0 },
            { seatIndex: 2, bid: 0 }
        ];

        mockContext.roomData.currentTurn = 'p4';

        // 4th player passes
        const action = { playerId: 'p4', type: ActionType.BID, payload: { bid: 0 } };
        state.handleInput(mockContext, action);

        // Verification
        // 1. Should NOT transition to dealing state
        expect(mockContext.transitionTo).not.toHaveBeenCalledWith(mockDealingState);

        // 2. Should transition to PlayingState
        expect(mockContext.transitionTo).toHaveBeenCalledWith(mockPlayingState);

        // 3. One player should be landlord
        const landlord = mockContext.roomData.players.find((p: any) => p.role === 'landlord');
        expect(landlord).toBeDefined();

        // 4. Highest bid should be set to 1
        expect(mockContext.roomData.highestBid).toBe(1);
    });
});
