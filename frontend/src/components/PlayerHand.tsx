import { useRef, useState, useEffect } from 'react';
import type { Card as CardType } from '../types';
import { Card } from './game/Card';  // Issue #36: 使用统一的 Card 组件

interface PlayerHandProps {
    cards: CardType[];
    isHuman?: boolean;
    onCardClick?: (card: CardType) => void;
    onSelectionChange?: (selectedCardIds: string[], isAdditive?: boolean) => void;
    className?: string;
}

export function PlayerHand({ cards, isHuman = false, onCardClick, onSelectionChange, className = '' }: PlayerHandProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number; isDragging: boolean } | null>(null);

    // Reset card refs array when cards change
    useEffect(() => {
        cardRefs.current = cardRefs.current.slice(0, cards.length);
    }, [cards]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isHuman || !containerRef.current) return;
        // Only start drag if clicking on the background, not directly on a card?
        // Actually, standard behavior is click on background starts drag. Click on card selects it (or toggles).
        // If we click on a card and drag, it usually moves the card (drag and drop).
        // But here we want box selection.
        // Let's allow box selection if starting on background OR if we decide to override card click.
        // For now, let's say if target is the container or the gap between cards.

        // Simple check: if e.target is a card, maybe don't start box select?
        // But users might want to start box select *on* a card.
        // Let's start box select regardless for now, unless we implement drag-and-drop later.

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelectionBox({
            startX: x,
            startY: y,
            endX: x,
            endY: y,
            isDragging: true
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!selectionBox?.isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
    };

    const handleMouseUp = () => {
        if (!selectionBox?.isDragging) return;

        // Calculate selection
        if (onSelectionChange && containerRef.current) {
            const boxRect = {
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                right: Math.max(selectionBox.startX, selectionBox.endX),
                bottom: Math.max(selectionBox.startY, selectionBox.endY)
            };

            // If box is very small (click), ignore?
            if (Math.abs(selectionBox.endX - selectionBox.startX) < 5 && Math.abs(selectionBox.endY - selectionBox.startY) < 5) {
                setSelectionBox(null);
                return;
            }

            const selectedIds: string[] = [];

            cardRefs.current.forEach((ref, index) => {
                if (!ref) return;
                // We need the position of the card relative to the container
                // Since cardRefs are children of container (mostly), we can use offsetLeft/Top?
                // But cards are in a flex container with negative margins.
                // Best to use getBoundingClientRect for both and compare.

                const cardRect = ref.getBoundingClientRect();
                const containerRect = containerRef.current!.getBoundingClientRect();

                const relativeCard = {
                    left: cardRect.left - containerRect.left,
                    top: cardRect.top - containerRect.top,
                    right: cardRect.right - containerRect.left,
                    bottom: cardRect.bottom - containerRect.top
                };

                // Check intersection
                const intersects = !(
                    boxRect.right < relativeCard.left ||
                    boxRect.left > relativeCard.right ||
                    boxRect.bottom < relativeCard.top ||
                    boxRect.top > relativeCard.bottom
                );

                if (intersects) {
                    selectedIds.push(cards[index].id);
                }
            });

            if (selectedIds.length > 0) {
                onSelectionChange(selectedIds, false); // Replace selection? Or Add? Let's replace for now.
            }
        }

        setSelectionBox(null);
    };

    // Global mouse up to catch release outside container
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (selectionBox?.isDragging) {
                handleMouseUp();
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [selectionBox]);


    if (!isHuman) {
        // AI Player: Show card backs (or just count)
        // For visual flair, let's show a stack of backs
        return (
            <div className={`flex items-center justify-center ${className}`}>
                <div className="relative h-28 w-20">
                    {cards.map((_, index) => (
                        <div
                            key={index}
                            className="absolute top-0 left-0"
                            style={{ transform: `translate(${index * 2}px, ${index * -1}px)` }}
                        >
                            <Card card={cards[0]} isBack small />
                        </div>
                    ))}
                    <div className="absolute -bottom-8 w-full text-center font-bold text-white bg-black bg-opacity-50 rounded">
                        {cards.length}
                    </div>
                </div>
            </div>
        );
    }

    // Human Player
    // Calculate dynamic overlap based on card count and available width
    // Use viewport width minus minimal gaps (40px each side)
    // Use viewport width minus sidebar/padding (approx 300px for sidebar + gaps)
    // Issue #60: Adjust width to be consistent with GameBoard layout. User requested +200px.
    // Previous: window.innerWidth - 360. New: window.innerWidth - 160.
    const cardWidth = 80;
    const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 160 : 1200; // Expanded width
    const minOverlap = 20; // Minimum overlap in pixels
    const maxOverlap = 65; // Increased max overlap for better density on small hands

    // Calculate required overlap to fit all cards
    const totalNaturalWidth = cards.length * cardWidth;
    const requiredOverlap = cards.length > 1
        ? Math.max(minOverlap, Math.min(maxOverlap, (totalNaturalWidth - availableWidth) / (cards.length - 1)))
        : 0;

    return (
        <div
            ref={containerRef}
            className={`relative flex justify-center items-end h-48 select-none ${className}`} // Increased height for drag area
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <div className="flex pointer-events-none" style={{ marginLeft: 0 }}>
                {/* Actually, if we want drag select, we should probably let events bubble up. */}
                {cards.map((card, index) => (
                    <div
                        key={card.id}
                        ref={el => { cardRefs.current[index] = el; }}
                        className="transition-transform duration-200 pointer-events-auto" // Re-enable pointer events
                        style={{ marginLeft: index === 0 ? 0 : `-${requiredOverlap}px` }}
                    >
                        <Card card={card} onClick={onCardClick} />
                    </div>
                ))}
            </div>

            {/* Selection Box */}
            {selectionBox && selectionBox.isDragging && (
                <div
                    className="absolute border-2 border-blue-500 bg-blue-300 bg-opacity-30 pointer-events-none z-50"
                    style={{
                        left: Math.min(selectionBox.startX, selectionBox.endX),
                        top: Math.min(selectionBox.startY, selectionBox.endY),
                        width: Math.abs(selectionBox.endX - selectionBox.startX),
                        height: Math.abs(selectionBox.endY - selectionBox.startY),
                    }}
                />
            )}
        </div>
    );
}
