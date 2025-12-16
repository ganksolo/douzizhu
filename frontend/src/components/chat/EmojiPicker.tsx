import React, { useState, useRef, useEffect } from 'react';

// 常用 Emoji 列表 (24 个)
const EMOJI_LIST = [
    '😀', '😂', '🤣', '😊', '😍', '🥰',
    '😎', '🤔', '😮', '😢', '😡', '🥳',
    '👍', '👎', '👏', '🙏', '💪', '🎉',
    '❤️', '🔥', '⭐', '💯', '🎮', '🃏',
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
}

/**
 * Emoji 选择器组件
 */
export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = (emoji: string) => {
        onSelect(emoji);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                title="选择 Emoji"
            >
                😊
            </button>
            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 p-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl grid grid-cols-6 gap-1 w-52 z-50">
                    {EMOJI_LIST.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => handleSelect(emoji)}
                            className="p-1.5 text-xl hover:bg-gray-700 rounded transition-colors"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmojiPicker;
