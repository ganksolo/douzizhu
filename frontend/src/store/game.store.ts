import { create } from 'zustand';
import { parseCardList } from '../utils/cardUtils';

// --- Types ---
export type GamePhase = 'INIT' | 'DEALING' | 'BIDDING' | 'PLAYING' | 'GAME_END';

export interface GamePlayer {
    userId: string;
    username: string;
    seatIndex: number;
    handCount: number;
    isBot: boolean;
    // We might add more specific game-related fields here later (e.g. role: landlord/peasant)
}

export interface LastPlayedState {
    seatIndex: number;
    cards: number[]; // Change to Card object type later if needed
}

export interface BidRecord {
    seatIndex: number;
    bid: number;
}

// Issue #34: 游戏结束数据
export interface GameEndData {
    winnerId: string;
    isLandlordWin: boolean;
    multiplier: number;
}

export interface GameState {
    // Core Data
    phase: GamePhase;
    players: GamePlayer[];
    mySeatId: number | null;
    currentTurn: number | null; // seatIndex
    bottomCards: number[];
    lastPlayedCards: LastPlayedState | null;
    myHand: number[]; // Local player's hand cards (sorted)

    // Bidding Data
    highestBid: number;
    landlordSeatIndex: number | null;
    bidHistory: BidRecord[];

    // Issue #34: Game End Data
    gameEnd: GameEndData | null;

    // Actions
    setSyncState: (data: any) => void;
    setMySeatId: (seatId: number) => void;
    resetGame: () => void;

    // Selectors
    getRelativeSeat: (targetSeatIndex: number) => 'bottom' | 'right' | 'top' | 'left';
}

export const useGameStore = create<GameState>((set, get) => ({
    // Initial State
    phase: 'INIT',
    players: [],
    mySeatId: null,
    currentTurn: null,
    bottomCards: [],
    lastPlayedCards: null,
    myHand: [],
    highestBid: 0,
    landlordSeatIndex: null,
    bidHistory: [],
    gameEnd: null,



    // Actions
    setSyncState: (data: any) => {
        console.log('[GameStore] sync_state:', data);
        // Map backend data to store state
        // Assuming backend sends: { phase, players, currentTurn, bottomCards, lastPlayedCards, ... }

        // Parse cards from strings to numbers
        // Fix Issue #26: 从 players 数组中提取自己的手牌 (只有自己能看到自己的 hand)
        const myPlayerData = data.players?.find((p: any) => p.hand && p.hand.length > 0);

        // Fix Issue #38: 斗地主标准排序
        // 牌面大小: 大王(17) > 小王(16) > 2(15) > A(14) > K(13) > Q(12) > J(11) > 10(10) > ... > 3(3)
        const ddzCardValue = (v: number): number => {
            if (v === 53) return 17; // 大王
            if (v === 52) return 16; // 小王
            const rank = v % 13; // 0=3, 1=4, ..., 10=K, 11=A, 12=2
            if (rank === 12) return 15; // 2
            if (rank === 11) return 14; // A
            return rank + 3; // 3(0+3=3) ~ K(10+3=13)
        };
        const myHand = myPlayerData?.hand
            ? parseCardList(myPlayerData.hand).sort((a, b) => {
                const diff = ddzCardValue(b) - ddzCardValue(a);
                if (diff !== 0) return diff;
                // 同牌面按花色排序 (♠ > ♥ > ♣ > ♦)
                return Math.floor(b / 13) - Math.floor(a / 13);
            })
            : [];
        const bottomCards = data.bottomCards ? parseCardList(data.bottomCards) : [];

        // Fix: If new sync_state has no lastPlayedCards, preserve old value (don't overwrite with null)
        let lastPlayedCards = get().lastPlayedCards; // Start with current value
        const eventId = Date.now() % 10000; // Simple event ID for debugging

        if (data.lastPlayedCards) {
            console.log(`[GameStore #${eventId}] lastPlayedCards raw:`, JSON.stringify(data.lastPlayedCards));
            if (data.lastPlayedCards.cards && data.lastPlayedCards.cards.length > 0) {
                const parsedCards = parseCardList(data.lastPlayedCards.cards);
                console.log(`[GameStore #${eventId}] Parsed cards:`, parsedCards, 'from:', data.lastPlayedCards.cards);
                if (parsedCards.length > 0) {
                    lastPlayedCards = {
                        seatIndex: data.lastPlayedCards.seatIndex,
                        cards: parsedCards
                    };
                } else {
                    console.warn(`[GameStore #${eventId}] parseCardList returned empty array!`);
                }
            } else {
                console.warn(`[GameStore #${eventId}] lastPlayedCards.cards is empty or undefined:`, data.lastPlayedCards.cards);
            }
        } else {
            console.log(`[GameStore #${eventId}] No lastPlayedCards in sync_state, preserving:`, lastPlayedCards);
        }

        // Fix Issue #28: 自动从 myPlayerData 推断 mySeatId
        const inferredSeatId = myPlayerData?.seatIndex ?? get().mySeatId;
        console.log('[GameStore] mySeatId debug:', {
            myPlayerData: myPlayerData?.seatIndex,
            currentMySeatId: get().mySeatId,
            inferred: inferredSeatId
        });

        // Issue #34: 从 BE 独立字段构造 gameEnd 对象
        // BE StateSerializer 发送 winnerId, winnerSeatIndex, isLandlordWin, multiplier 作为独立字段
        const gameEnd = data.winnerId ? {
            winnerId: data.winnerId,
            winnerSeatIndex: data.winnerSeatIndex,
            isLandlordWin: data.isLandlordWin,
            multiplier: data.multiplier ?? 1,
        } : null;

        // Debug: Log before set()
        console.log('[GameStore] About to set lastPlayedCards:', lastPlayedCards);

        set({
            phase: data.phase || 'INIT',
            players: data.players || [],
            currentTurn: data.currentTurn ?? null,
            bottomCards,
            lastPlayedCards,
            myHand,
            highestBid: data.highestBid ?? 0,
            landlordSeatIndex: data.landlordSeatIndex ?? null,
            bidHistory: data.bidHistory ?? [],
            // Issue #34: 游戏结束数据
            gameEnd: gameEnd,
            // Fix Issue #28: 自动同步 mySeatId
            ...(inferredSeatId !== null && inferredSeatId !== undefined ? { mySeatId: inferredSeatId } : {}),
        });

        // Debug: Log after set()
        console.log('[GameStore] After set, state.lastPlayedCards:', get().lastPlayedCards);
    },

    setMySeatId: (seatId: number) => {
        set({ mySeatId: seatId });
    },

    resetGame: () => {
        set({
            phase: 'INIT',
            players: [],
            currentTurn: null,
            bottomCards: [],
            lastPlayedCards: null,
            myHand: [],
            highestBid: 0,
            landlordSeatIndex: null,
            bidHistory: [],
            gameEnd: null,
            // mySeatId typically persists if in the same room, but can clear if leaving
        });
    },

    // Selectors
    getRelativeSeat: (targetSeatIndex: number) => {
        const { mySeatId } = get();
        // Fallback: Default to viewing as if at seat 0 if no seat assigned (Observer)
        const anchorSeat = (mySeatId === null || mySeatId === undefined) ? 0 : mySeatId;

        // 4-Player Relation
        // Bottom: Me
        // Right: (Me + 1) % 4
        // Top: (Me + 2) % 4
        // Left: (Me + 3) % 4

        const diff = (targetSeatIndex - anchorSeat + 4) % 4;

        let result: 'bottom' | 'right' | 'top' | 'left';
        if (diff === 0) result = 'bottom';
        else if (diff === 1) result = 'right';
        else if (diff === 2) result = 'top';
        else result = 'left'; // diff === 3

        return result;
    }
}));
