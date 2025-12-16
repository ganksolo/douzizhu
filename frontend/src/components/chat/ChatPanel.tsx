import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { SocketService } from '../../services/socket';
import { useAuthStore } from '../../store/auth.store';
import { useToast } from '../ui/useToast';
import { ChatMessage } from './ChatMessage';
import type { ChatMessageData } from './ChatMessage';
import { EmojiPicker } from './EmojiPicker';

interface ChatPanelProps {
    roomId: string;
}

const MAX_MESSAGES = 50;
const MAX_TEXT_LENGTH = 200;

/**
 * 房间聊天面板组件
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ roomId }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const [inputText, setInputText] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const isExpandedRef = useRef(isExpanded);

    // Keep ref in sync with state
    isExpandedRef.current = isExpanded;

    const { user } = useAuthStore();
    const { toast } = useToast();

    // 滚动到底部
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // 监听消息
    useEffect(() => {
        console.log('[ChatPanel] Setting up chat listeners for roomId:', roomId);

        // Ensure we're in the game socket room for this roomId
        // This is critical for receiving broadcasts
        if (roomId) {
            console.log('[ChatPanel] Emitting join_game to ensure socket room membership');
            SocketService.emit('join_game', { roomId });
        }

        const handleChatMessage = (data: ChatMessageData) => {
            console.log('[ChatPanel] ✅ Received chat_message:', data);
            setMessages((prev) => {
                const newMessages = [...prev, data];
                // 保留最近 50 条
                if (newMessages.length > MAX_MESSAGES) {
                    return newMessages.slice(-MAX_MESSAGES);
                }
                return newMessages;
            });

            // 未展开时增加未读计数
            if (!isExpandedRef.current) {
                setUnreadCount((c) => c + 1);
            }
        };

        const handleChatError = (data: { message: string }) => {
            console.log('[ChatPanel] ❌ Received chat_error:', data);
            toast({ message: data.message, type: 'error' });
        };

        SocketService.on('chat_message', handleChatMessage);
        SocketService.on('chat_error', handleChatError);

        return () => {
            console.log('[ChatPanel] Cleaning up chat listeners');
            SocketService.off('chat_message', handleChatMessage);
            SocketService.off('chat_error', handleChatError);
        };
    }, [roomId, toast]);

    // 新消息时滚动到底部
    useEffect(() => {
        if (isExpanded) {
            scrollToBottom();
        }
    }, [messages, isExpanded, scrollToBottom]);

    // 展开时清除未读
    useEffect(() => {
        if (isExpanded) {
            setUnreadCount(0);
        }
    }, [isExpanded]);

    // 发送消息
    const handleSend = useCallback(() => {
        const text = inputText.trim();
        if (!text) return;

        if (text.length > MAX_TEXT_LENGTH) {
            toast({ message: `消息长度不能超过 ${MAX_TEXT_LENGTH} 字符`, type: 'error' });
            return;
        }

        console.log('[ChatPanel] 📤 Sending chat_send:', { roomId, text, socketConnected: SocketService.getConnectionStatus() });
        SocketService.emit('chat_send', { roomId, text });
        setInputText('');
        inputRef.current?.focus();
    }, [inputText, roomId, toast]);

    // 键盘事件
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 插入 Emoji
    const handleEmojiSelect = (emoji: string) => {
        setInputText((prev) => prev + emoji);
        inputRef.current?.focus();
    };

    // 切换展开/折叠
    const toggleExpand = () => {
        setIsExpanded((prev) => !prev);
    };

    return (
        <div className="fixed bottom-4 right-4 z-40">
            {/* 折叠状态：只显示按钮 */}
            {!isExpanded && (
                <button
                    onClick={toggleExpand}
                    className="relative p-3 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30 transition-all hover:scale-110 hover:shadow-blue-500/50 animate-pulse hover:animate-none"
                    title="打开聊天"
                >
                    <MessageCircle size={24} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* 展开状态：聊天面板 */}
            {isExpanded && (
                <div className="w-80 h-96 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col">
                    {/* 标题栏 */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                        <span className="text-sm font-medium text-gray-200">房间聊天</span>
                        <button
                            onClick={toggleExpand}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="关闭聊天"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* 消息列表 */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-8">
                                暂无消息
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <ChatMessage
                                    key={`${msg.timestamp}-${index}`}
                                    {...msg}
                                    isOwn={msg.senderId === user?.userId}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 输入区域 */}
                    <div className="p-2 bg-gray-800 border-t border-gray-700">
                        <div className="flex items-end gap-1">
                            <EmojiPicker onSelect={handleEmojiSelect} />
                            <textarea
                                ref={inputRef}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="输入消息..."
                                className="flex-1 bg-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-blue-500 max-h-20"
                                rows={1}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputText.trim()}
                                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                title="发送"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <div className="text-right text-xs text-gray-500 mt-1">
                            {inputText.length}/{MAX_TEXT_LENGTH}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatPanel;
