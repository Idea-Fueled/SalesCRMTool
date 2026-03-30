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
            const { reply, data, type, count, value, total } = res.data;
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

    // Don't show on login/welcome screen
    if (!user) return null;

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl shadow-2xl shadow-red-200/50 flex items-center justify-center hover:scale-110 transition-all duration-300 group"
                    title="AI Sales Assistant"
                >
                    <Bot size={24} className="group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-[370px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Sparkles size={18} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">AI Sales Assistant</h3>
                                <p className="text-red-200 text-[10px] font-medium">Powered by Rank AI</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50/50 custom-scrollbar">
                        {messages.map((msg, i) => (
                            <ChatMessage key={i} message={msg} />
                        ))}

                        {/* Typing indicator */}
                        {loading && (
                            <div className="flex justify-start mb-3">
                                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                                    <div className="flex items-center gap-1.5">
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
                        <div className="px-4 py-2 border-t border-gray-50 bg-white flex-shrink-0">
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_ACTIONS.map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(action.query)}
                                        disabled={loading}
                                        className="px-2.5 py-1 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-600 text-[10px] font-bold rounded-lg border border-gray-100 hover:border-red-100 transition-all disabled:opacity-40"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Bar */}
                    <div className="p-3 border-t border-gray-100 bg-white flex-shrink-0">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 focus-within:border-red-200 focus-within:bg-white transition-all">
                            <Zap size={14} className="text-red-400 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about deals, contacts..."
                                disabled={loading}
                                className="flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 outline-none disabled:opacity-50"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || loading}
                                className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-red-600 active:scale-90"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
