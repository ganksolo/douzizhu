import React from 'react';

export interface ChatMessageData {
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
}

interface ChatMessageProps extends ChatMessageData {
    isOwn: boolean;
}

/**
 * 单条聊天消息组件
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({
    senderName,
    text,
    timestamp,
    isOwn,
}) => {
    const formatTime = (ts: number) => {
        const date = new Date(ts);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`flex flex-col mb-2 ${isOwn ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                <span className="font-medium">{senderName}</span>
                <span>·</span>
                <span>{formatTime(timestamp)}</span>
            </div>
            <div
                className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm break-words ${isOwn
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-700 text-gray-100 rounded-bl-none'
                    }`}
            >
                {text}
            </div>
        </div>
    );
};

export default ChatMessage;
