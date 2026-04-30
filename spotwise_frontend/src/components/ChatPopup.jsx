import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, getUserId, getRole } from "../utils/auth";
import { getSocket } from "../utils/socket";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const ChatPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUserId = getUserId();
  const currentRole = getRole();

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const res = await axios.get(`${API}/api/chats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setChats(res.data);
    } catch (err) {
      console.error("Failed to fetch chats", err);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId) => {
    setLoadingMessages(true);
    try {
      const res = await axios.get(`${API}/api/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const openChatWithUser = useCallback(async (userId) => {
    try {
      const res = await axios.post(
        `${API}/api/chats`,
        { userId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const chat = res.data;
      setChats((prev) => {
        const exists = prev.find((c) => c._id === chat._id);
        return exists ? prev : [chat, ...prev];
      });
      setActiveChat(chat);
      setIsOpen(true);
      fetchMessages(chat._id);

      const socket = getSocket();
      if (socket) socket.emit("join_chat", chat._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot open chat");
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { userId } = e.detail;
      if (userId) openChatWithUser(userId);
    };
    window.addEventListener("open-chat-with", handler);
    return () => window.removeEventListener("open-chat-with", handler);
  }, [openChatWithUser]);

  useEffect(() => {
    if (isOpen) fetchChats();
  }, [isOpen]);

  const handleSelectChat = (chat) => {
    const socket = getSocket();
    if (socket && activeChat) socket.emit("leave_chat", activeChat._id);
    setActiveChat(chat);
    fetchMessages(chat._id);
    if (socket) socket.emit("join_chat", chat._id);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (newMessage) => {
      if (activeChat && newMessage.chat === activeChat._id) {
        setMessages((prev) => [...prev, newMessage]);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const onTyping = (data) => {
      if (activeChat && data.chatId === activeChat._id) setIsTyping(true);
    };
    const onStopTyping = (data) => {
      if (activeChat && data.chatId === activeChat._id) setIsTyping(false);
    };

    const onBookingAccepted = (data) => {
      const otherUserId = currentRole === "seeker" ? data.providerId : data.seekerId;
      if (otherUserId) {
        openChatWithUser(typeof otherUserId === "object" ? otherUserId.toString() : otherUserId);
      }
    };

    socket.on("message_received", onMessage);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);
    socket.on("booking_accepted", onBookingAccepted);

    return () => {
      socket.off("message_received", onMessage);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
      socket.off("booking_accepted", onBookingAccepted);
    };
  }, [activeChat, currentRole, openChatWithUser]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const handleSend = async () => {
    const content = messageText.trim();
    if (!content || !activeChat || sending) return;

    setSending(true);
    setMessageText("");

    const socket = getSocket();
    if (socket) socket.emit("stop_typing", { chatId: activeChat._id });

    try {
      const res = await axios.post(
        `${API}/api/messages`,
        { content, chatId: activeChat._id },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setMessages((prev) => {
        const exists = prev.find((m) => m._id === res.data._id);
        return exists ? prev : [...prev, res.data];
      });
    } catch {
      toast.error("Failed to send message");
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);
    const socket = getSocket();
    if (!socket || !activeChat) return;

    socket.emit("typing", { chatId: activeChat._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { chatId: activeChat._id });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getOtherParticipant = (chat) => {
    if (!chat) return { name: "Unknown" };
    const seekerId = chat.seeker?._id || chat.seeker;
    
    if (seekerId === currentUserId) return chat.provider || { name: "Provider" };
    return chat.seeker || { name: "Seeker" };
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const isMine = (msg) => {
    return msg.senderId === currentUserId || msg.senderId?.toString() === currentUserId;
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl shadow-indigo-500/50 flex items-center justify-center text-3xl transition-transform hover:scale-105 z-[100]"
        title="Open Chat"
      >
        💬
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 w-[420px] h-[600px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] glass-card flex flex-col md:flex-row overflow-hidden z-[100] border-t-4 border-t-indigo-600 shadow-2xl">
          
          {/* Left panel: Chat list (Visible if no chat selected or on desktop) */}
          <div className={`${activeChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[160px] bg-white/40 border-r border-slate-200`}>
            <div className="p-4 border-b border-slate-200 bg-white/50 font-bold text-slate-800 flex justify-between items-center">
              <span>Messages</span>
              {!activeChat && (
                <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">✕</button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {loadingChats ? (
                <div className="flex justify-center p-6"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
              ) : chats.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 mt-4">No active chats.<br/>Accept a booking to chat!</div>
              ) : (
                chats.map((chat) => {
                  const other = getOtherParticipant(chat);
                  const preview = chat.booking?.serviceType || "Active Booking";
                  const isSelected = activeChat?._id === chat._id;
                  return (
                    <div
                      key={chat._id}
                      onClick={() => handleSelectChat(chat)}
                      className={`p-3 cursor-pointer border-b border-slate-100 transition-colors ${isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-white/60 border-l-4 border-l-transparent'}`}
                    >
                      <div className="font-semibold text-sm text-slate-800 truncate">{other.name || other.userName || "User"}</div>
                      <div className="text-xs text-slate-500 truncate mt-1 text-indigo-600/70 font-medium">{preview}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Messages */}
          <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-col flex-1 bg-white/60 relative`}>
            {!activeChat ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <div className="text-5xl mb-4 opacity-50">💬</div>
                <div className="text-sm font-medium">Select a chat to view messages</div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-3 bg-white/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveChat(null)} className="md:hidden text-slate-400 hover:text-indigo-600 px-2 font-bold">←</button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-md">
                      {getOtherParticipant(activeChat)?.name?.[0]?.toUpperCase() || getOtherParticipant(activeChat)?.userName?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">
                        {getOtherParticipant(activeChat)?.name || getOtherParticipant(activeChat)?.userName || "User"}
                      </div>
                      <div className="text-[10px] text-green-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Live Chat
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors px-2 text-lg">✕</button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]/50">
                  {loadingMessages ? (
                    <div className="flex justify-center p-6"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-slate-400 text-xs mt-10 bg-white/50 py-2 px-4 rounded-full inline-block mx-auto">No messages yet. Say hello! 👋</div>
                  ) : (
                    messages.map((msg) => {
                      const mine = isMine(msg);
                      return (
                        <div key={msg._id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] px-4 py-2 text-sm shadow-sm ${mine ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-sm'}`}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1">{formatTime(msg.createdAt)}</span>
                        </div>
                      );
                    })
                  )}

                  {isTyping && (
                    <div className="flex flex-col items-start">
                      <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center h-9">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: "0.4s"}}></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-1" />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white/80 border-t border-slate-200 flex gap-2">
                  <textarea
                    className="flex-1 bg-slate-100 border-transparent focus:border-indigo-300 focus:bg-white focus:ring-0 rounded-xl px-4 py-2 text-sm resize-none outline-none transition-all"
                    rows={1}
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !messageText.trim()}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${sending || !messageText.trim() ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                  >
                    ➤
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </>
  );
};

export default ChatPopup;