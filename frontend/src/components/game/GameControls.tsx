import React from 'react';
import { Play, SkipForward, Lightbulb } from 'lucide-react';

interface GameControlsProps {
    onPlay: () => void;
    onPass: () => void;
    onHint: () => void;
    selectedCount: number;
    isTurn: boolean;
    canPass: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
    onPlay,
    onPass,
    onHint,
    selectedCount,
    isTurn,
    canPass
}) => {
    if (!isTurn) return null;

    return (
        <div className="flex gap-4 items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Pass Button */}
            <button
                onClick={onPass}
                disabled={!canPass}
                className={`
                    flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-all
                    ${!canPass
                        ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-600 hover:bg-gray-500 text-white active:scale-95 hover:shadow-xl'
                    }
                `}
            >
                <SkipForward size={20} />
                Pass
            </button>

            {/* Hint Button */}
            <button
                onClick={onHint}
                className="
                    flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-all
                    bg-green-600 hover:bg-green-500 text-white active:scale-95 hover:shadow-xl
                "
            >
                <Lightbulb size={20} />
                Hint
            </button>

            {/* Play Button */}
            <button
                onClick={onPlay}
                disabled={selectedCount === 0}
                className={`
                    flex items-center gap-2 px-8 py-3 rounded-full font-bold shadow-lg transition-all
                    ${selectedCount === 0
                        ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 hover:shadow-xl shadow-blue-900/50'
                    }
                `}
            >
                <Play size={20} fill="currentColor" />
                Play {selectedCount > 0 && `(${selectedCount})`}
            </button>
        </div>
    );
};
