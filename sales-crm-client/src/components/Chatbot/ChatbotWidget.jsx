import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Bot, Zap } from "lucide-react";
import { sendChatMessage } from "../../API/services/chatbotService";
import ChatMessage from "./ChatMessage";
import { useAuth } from "../../context/AuthContext";

const QUICK_ACTIONS = [
    { label: "🔥 Hot Deals", query: "show hot deals" },
    { label: "📊 My Deals", query: "show my deals" },
    { label: "🏢 Top Companies", query: "top companies" },
    { label: "👥 Top Contacts", query: "top contacts" },
];

export default function ChatbotWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: "bot",
            text: "Hey! 👋 I'm your **AI Sales Assistant**. Ask me about deals, contacts, or companies — I'll rank them for you! Type **help** for all commands.",
            type: "greeting"
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [isOpen]);

    const handleSend = async (text) => {
        const query = text || input.trim();
        if (!query || loading) return;

        // Add user message
        setMessages(prev => [...prev, { role: "user", text: query }]);
        setInput("");
        setLoading(true);

        try {
            const res = await sendChatMessage(query);
            const { reply, data, type } = res.data;
            setMessages(prev => [...prev, {
                role: "bot",
                text: reply,
                data: data || null,
                type: type || "text"
            }]);
        } catch (error) {
            const errMsg = error.response?.status === 401
                ? "Your session expired. Please log in again."
                : "Something went wrong. Please try again.";
            setMessages(prev => [...prev, {
                role: "bot",
                text: errMsg,
                type: "error"
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed sm:bottom-6 sm:right-6 bottom-4 right-4 z-50 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(220,38,38,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group border border-white/20"
                    title="AI Sales Assistant"
                >
                    <div className="relative">
                        <Bot size={24} className="sm:size-28 group-hover:rotate-12 transition-transform" />
                        <Sparkles size={10} className="sm:size-12 absolute -top-2 -right-2 text-red-100 animate-pulse" />
                    </div>
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div className={`fixed sm:bottom-6 sm:right-6 bottom-4 right-4 z-50 sm:w-[400px] w-[calc(100vw-32px)] ${isMinimized ? 'h-16' : 'sm:h-[600px] h-[550px] max-h-[calc(100vh-100px)]'} bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-white/20 flex flex-col overflow-hidden transition-all duration-500 ease-out animate-in fade-in zoom-in-95 slide-in-from-bottom-10`}>
                    
                    {/* Header */}
                    <div 
                        className="bg-red-600 px-6 py-4 flex items-center justify-between flex-shrink-0 cursor-pointer shadow-lg shadow-red-900/10"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm tracking-tight">AI Sales Assistant</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all active:scale-90"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages Body */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-gray-50/80 to-white/80 custom-scrollbar-premium">
                                {messages.map((msg, i) => (
                                    <ChatMessage key={i} message={msg} isLast={i === messages.length - 1} />
                                ))}
                                
                                {loading && (
                                    <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300 mb-4">
                                        <div className="bg-white/80 backdrop-blur-sm border border-white px-5 py-4 rounded-2xl rounded-bl-lg shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Actions */}
                            {messages.length <= 2 && (
                                <div className="px-5 py-3 border-t border-gray-50 bg-white/50 backdrop-blur-sm flex-shrink-0 animate-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex flex-wrap gap-2">
                                        {QUICK_ACTIONS.map((action, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSend(action.query)}
                                                disabled={loading}
                                                className="px-3.5 py-1.5 bg-white border border-gray-100 hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-gray-700 text-[11px] font-bold rounded-2xl shadow-sm transition-all duration-300 disabled:opacity-40 active:scale-95 group"
                                            >
                                                <span className="group-hover:scale-110 inline-block transition-transform">{action.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input Bar */}
                            <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
                                <div className="flex items-center gap-3 bg-gray-50/50 backdrop-blur-md rounded-2xl px-4 py-3 border border-gray-100 focus-within:border-red-400 focus-within:bg-white focus-within:shadow-[0_0_20px_-5px_rgba(220,38,38,0.1)] transition-all duration-300">
                                    <Zap size={16} className="text-red-500 opacity-60 flex-shrink-0" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask our AI something premium..."
                                        disabled={loading}
                                        className="flex-1 bg-transparent text-sm font-semibold text-gray-700 placeholder-gray-400 outline-none disabled:opacity-50"
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!input.trim() || loading}
                                        className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-xl flex items-center justify-center transition-all duration-300 shadow-md shadow-red-900/10 disabled:opacity-30 active:scale-90"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
