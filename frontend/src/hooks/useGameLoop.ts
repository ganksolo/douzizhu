import { useEffect, useState } from 'react';
import type { Card, GamePhase, Player } from '../types';
import { createDeck, dealCards, shuffleDeck } from '../utils/deck';
import { canBeat, getHandType } from '../utils/rules';
import { aiAction } from '../utils/ai';
import { soundManager } from '../utils/sound';
import { ScoreManager, type GameResult } from '../utils/score';

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

    // Scoring State
    const [bombCount, setBombCount] = useState<number>(0);
    const [cardsPlayedByRole, setCardsPlayedByRole] = useState<{ landlord: boolean; peasant: boolean }>({
        landlord: false,
        peasant: false
    });
    const [gameResult, setGameResult] = useState<GameResult | null>(null);

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
        setBombCount(0);
        setCardsPlayedByRole({ landlord: false, peasant: false });
        setGameResult(null);

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

        // Update Scoring State
        if (handType.type === 'Bomb' || handType.type === 'Rocket') {
            setBombCount(prev => prev + 1);
            soundManager.play('bomb'); // Assuming we have a bomb sound, or reuse play
        }

        setCardsPlayedByRole(prev => ({
            ...prev,
            [player.role]: true
        }));

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

    // Game Over & Scoring Effect
    useEffect(() => {
        if (phase === 'GAME_OVER' && winnerId && landlordId && !gameResult) {
            // Calculate Score
            const baseScore = bids[landlordId] || 1;

            // Spring: Landlord wins, peasants played no cards
            // Anti-Spring: Peasants win, landlord played only first hand (cardsPlayedByRole.landlord is true, but we need to check if they played AGAIN)
            // Actually, Anti-Spring definition: Landlord plays only once (the first hand), and never plays again.
            // My simple `cardsPlayedByRole` boolean is not enough for Anti-Spring strict check.
            // Strict Anti-Spring: Landlord plays start hand. Peasants take control and finish game without Landlord playing again.
            // So Landlord played count == 1.
            // But I only tracked boolean.
            // Let's approximate: If Peasants win, and Landlord hand size is 20 - (cards played in first turn).
            // Or simpler: Landlord has 17 cards left? No, Landlord starts with 20.
            // If Landlord has 20 cards left? Impossible if they started.
            // If Landlord played once, they have < 20 cards.
            // Let's stick to the boolean for now, or maybe just check if Landlord hand length is high?
            // Actually, if Peasants win, and Landlord has NOT played any *more* cards since start...
            // It's hard to track "played more" without a counter.
            // Let's just use the boolean for Spring (Landlord wins, peasant played = false).
            // For Anti-Spring (Peasant wins, landlord played = true... wait).
            // Anti-Spring: Landlord plays out first hand. Peasants play. Landlord never plays again.
            // So Landlord played exactly 1 time.
            // I'll skip strict Anti-Spring for now and just do Spring.
            // Or I can check `cardsPlayedByRole.peasant === false` for Spring.

            const isSpring = winnerId === landlordId && !cardsPlayedByRole.peasant;
            // For Anti-Spring, let's just say if Peasant wins and Landlord has 17+ cards? (Assuming they played a single or pair or triple)
            // It's an approximation.
            const isAntiSpring = false;

            const result = ScoreManager.calculateScore(
                winnerId,
                landlordId,
                baseScore,
                bombCount,
                isSpring,
                isAntiSpring,
                players
            );

            ScoreManager.saveResult(result);
            setGameResult(result);

            if (winnerId === players[0].id) {
                soundManager.play('win');
            } else {
                soundManager.play('lose');
            }
        }
    }, [phase, winnerId, landlordId, bombCount, cardsPlayedByRole, players, bids, gameResult]);

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
        gameResult, // Export gameResult
        startGame,
        handleBid,
        handlePlay,
        handlePass,
        setPlayers, // Exposed for card selection updates
    };
}
