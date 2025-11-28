import { useEffect, useState } from 'react';
import type { Card, GamePhase, Player } from '../types';
import { createDeck, dealCards, shuffleDeck } from '../utils/deck';
import { canBeat, getHandType } from '../utils/rules';
import { aiAction } from '../utils/ai';
import { soundManager } from '../utils/sound';

export function useGameLoop(onError?: (message: string, type?: 'error' | 'warning') => void) {
    const [phase, setPhase] = useState<GamePhase>('DEALING');
    const [players, setPlayers] = useState<Player[]>([]);
    const [bottomCards, setBottomCards] = useState<Card[]>([]);
    const [currentTurn, setCurrentTurn] = useState<number>(0);
    const [landlordId, setLandlordId] = useState<string | null>(null);
    const [lastPlayedCards, setLastPlayedCards] = useState<{
        cards: Card[];
        playerId: string;
        type: any;
    } | null>(null);
    const [passCount, setPassCount] = useState<number>(0);
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [bids, setBids] = useState<Record<string, number>>({});

    const [cardsDealt, setCardsDealt] = useState<number>(0);
    const [isShuffling, setIsShuffling] = useState<boolean>(false);

    // Start Game
    const startGame = () => {
        setPhase('DEALING');
        setIsShuffling(true);
        setCardsDealt(0);
        setPlayers([]);
        setBottomCards([]);
        setLandlordId(null);
        setLastPlayedCards(null);
        setPassCount(0);
        setWinnerId(null);
        setBids({});

        // Shuffle Animation (1s)
        setTimeout(() => {
            setIsShuffling(false);
            const deck = createDeck();
            const shuffledDeck = shuffleDeck(deck);
            const { hands, bottomCards } = dealCards(shuffledDeck);

            // Initialize players with empty hands first (or full hands but we control visibility in UI)
            // To make "flying" animation easier, we can give them full hands but use `cardsDealt` to control how many are shown/animated.
            const newPlayers: Player[] = hands.map((hand, index) => ({
                id: `player-${index}`,
                name: index === 0 ? 'You' : `AI ${index}`,
                hand, // Full hand
                role: 'peasant',
                isAI: index !== 0,
            }));

            setPlayers(newPlayers);
            setBottomCards(bottomCards);

            // Dealing Animation
            // Total cards per player = 25. We can deal 1 round (4 cards) at a time or 1 card at a time.
            // Let's do 1 card at a time for 4 players = 100 steps? Too slow.
            // Let's just increment `cardsDealt` from 0 to 25.
            // When `cardsDealt` increases, the UI shows more cards.

            let currentDealt = 0;
            const dealInterval = setInterval(() => {
                currentDealt += 1;
                setCardsDealt(currentDealt);

                if (currentDealt >= 25) {
                    clearInterval(dealInterval);
                    setTimeout(() => {
                        setPhase('BIDDING');
                        setCurrentTurn(0);
                    }, 500);
                }
            }, 50); // 25 * 50ms = 1.25s total dealing time
        }, 1000);
    };

    // Bidding Logic
    const handleBid = (score: number) => {
        if (phase !== 'BIDDING') return;

        const currentPlayer = players[currentTurn];
        console.log(`${currentPlayer.name} bids ${score}`);

        setBids((prev) => ({ ...prev, [currentPlayer.id]: score }));

        // Move to next bidder
        const nextTurn = (currentTurn + 1) % 4;

        // Check if everyone has bid
        if (Object.keys(bids).length + 1 === 4) {
            // Determine Landlord
            const allBids = { ...bids, [currentPlayer.id]: score };
            let maxScore = 0;
            let winnerId = players[0].id; // Default to human if tie/error, but logic below fixes it

            // Find highest bidder
            Object.entries(allBids).forEach(([pid, s]) => {
                if (s > maxScore) {
                    maxScore = s;
                    winnerId = pid;
                }
            });

            // If everyone passed (score 0), restart or force landlord?
            // For simplicity, if maxScore is 0, Player 0 becomes landlord with score 1.
            if (maxScore === 0) {
                maxScore = 1;
                winnerId = players[0].id;
            }

            setLandlordId(winnerId);

            // Assign roles and give bottom cards
            setPlayers((prev) => {
                return prev.map((p) => {
                    if (p.id === winnerId) {
                        return {
                            ...p,
                            role: 'landlord',
                            hand: [...p.hand, ...bottomCards].sort((a, b) => b.value - a.value),
                        };
                    }
                    return { ...p, role: 'peasant' };
                });
            });

            setPhase('PLAYING');
            // Landlord starts playing
            const landlordIndex = players.findIndex((p) => p.id === winnerId);
            setCurrentTurn(landlordIndex);
        } else {
            setCurrentTurn(nextTurn);
        }
    };

    // Playing Logic
    const handlePlay = (selectedCards: Card[]) => {
        if (phase !== 'PLAYING') return;

        const player = players[currentTurn];
        const handType = getHandType(selectedCards);

        if (!handType) {
            onError?.('Invalid hand type.', 'error');
            return;
        }

        // Validation
        if (lastPlayedCards && lastPlayedCards.playerId !== player.id) {
            if (!canBeat(lastPlayedCards.cards, selectedCards)) {
                onError?.('Cannot beat last played cards.', 'error');
                return;
            }
        }

        // Execute Play
        setLastPlayedCards({
            cards: selectedCards,
            playerId: player.id,
            type: handType,
        });
        setPassCount(0); // Reset pass count on valid play
        soundManager.play('play');

        // Check Win (using the updated hand length logic is tricky inside setState, so we do it here or use a ref/effect)
        // Actually, we can check if the hand became empty.
        // However, since we are inside setPlayers, we can't easily see the result immediately outside.
        // Let's modify the logic to check *before* setting state, or check inside.

        let isGameOver = false;
        setPlayers((prev) => {
            const newPlayers = [...prev];
            newPlayers[currentTurn].hand = newPlayers[currentTurn].hand.filter(
                (c) => !selectedCards.some((sc) => sc.id === c.id)
            );

            if (newPlayers[currentTurn].hand.length === 0) {
                setWinnerId(player.id);
                setPhase('GAME_OVER');
                isGameOver = true;
            }

            return newPlayers;
        });

        // Only advance turn if game is not over
        // We need to use a timeout or effect to ensure state update? 
        // Or just rely on the fact that if we setPhase('GAME_OVER'), the effect will stop the loop.
        // But we still need to prevent setCurrentTurn if game is over.
        // The issue is `phase` is stale here.

        // Simplest fix: Don't check phase here, just rely on the fact that if game over, UI changes.
        // But we want to stop turn advancement.
        // Let's use a flag.
        if (!isGameOver) {
            setCurrentTurn((prev) => (prev + 1) % 4);
        }
    };

    const handlePass = () => {
        if (phase !== 'PLAYING') return;

        const currentPlayer = players[currentTurn];
        // Cannot pass if you are the leader (no one has played yet or you played last)
        if (!lastPlayedCards || lastPlayedCards.playerId === currentPlayer.id) {
            onError?.('You cannot pass when you are the leader.', 'warning');
            return;
        }

        const newPassCount = passCount + 1;
        setPassCount(newPassCount);

        if (newPassCount >= 3) {
            // New Round
            setLastPlayedCards(null);
            setPassCount(0);
        }

        setCurrentTurn((prev) => (prev + 1) % 4);
    };

    useEffect(() => {
        if (phase === 'GAME_OVER') return;

        const currentPlayer = players[currentTurn];
        if (!currentPlayer) return;

        // Skip if not AI and not auto-play enabled
        if (!currentPlayer.isAI && !currentPlayer.isAutoPlay) return;

        const timer = setTimeout(() => {
            if (phase === 'BIDDING') {
                const bid = Math.floor(Math.random() * 4);
                handleBid(bid);
            } else if (phase === 'PLAYING') {
                // Determine next player's role for cooperation strategy
                const nextPlayer = players[(currentTurn + 1) % 4];
                const nextPlayerRole = nextPlayer?.role;

                // AI Play Logic with enhanced strategy
                const decision = aiAction(
                    currentPlayer.hand,
                    lastPlayedCards && lastPlayedCards.playerId !== currentPlayer.id ? lastPlayedCards : null,
                    currentPlayer.role,
                    nextPlayerRole
                );

                if (decision.cards) {
                    handlePlay(decision.cards);
                } else {
                    handlePass();
                }
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [currentTurn, phase, players, lastPlayedCards]);

    return {
        phase,
        players,
        bottomCards,
        currentTurn,
        landlordId,
        lastPlayedCards,
        winnerId,
        cardsDealt,
        isShuffling,
        startGame,
        handleBid,
        handlePlay,
        handlePass,
        setPlayers, // Exposed for card selection updates
    };
}
