// components/ChatPopup.jsx
import React, { useState, useEffect, useRef, useCallback} from "react";
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

  // ── Fetch all chats ───────────────────────────────
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

  // ── Fetch messages for a chat ─────────────────────
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

  // ── Open chat with a specific user ───────────────
  // Called from pages via custom event: open-chat-with
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
        toast.error(err.response?.data?.message || "Cannot open chat — no active booking");
    }
    }, []); // ✅ important

  // ── Listen for custom event from pages ───────────
  useEffect(() => {
    const handler = (e) => {
      const { userId } = e.detail;
      if (userId) openChatWithUser(userId);
    };
    window.addEventListener("open-chat-with", handler);
    return () => window.removeEventListener("open-chat-with", handler);
  }, [openChatWithUser]);

  // ── Open popup → fetch chats ──────────────────────
  useEffect(() => {
    if (isOpen) fetchChats();
  }, [isOpen]);

  // ── Switch active chat ────────────────────────────
  const handleSelectChat = (chat) => {
    // Leave old room
    const socket = getSocket();
    if (socket && activeChat) socket.emit("leave_chat", activeChat._id);

    setActiveChat(chat);
    fetchMessages(chat._id);

    // Join new room
    if (socket) socket.emit("join_chat", chat._id);
  };

  // ── Scroll to bottom on new messages ─────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Socket events ─────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // New message received
    const onMessage = (newMessage) => {
      if (activeChat && newMessage.chat?._id === activeChat._id) {
        setMessages((prev) => [...prev, newMessage]);
      } else {
        // Increment unread if popup is closed or different chat
        setUnreadCount((prev) => prev + 1);
      }
      // Update latest message in chat list
      setChats((prev) =>
        prev.map((c) =>
          c._id === newMessage.chat?._id
            ? { ...c, latestMessage: newMessage }
            : c
        )
      );
    };

    // Typing indicator
    const onTyping = (data) => {
      if (activeChat && data.chatId === activeChat._id) {
        setIsTyping(true);
      }
    };
    const onStopTyping = (data) => {
      if (activeChat && data.chatId === activeChat._id) {
        setIsTyping(false);
      }
    };

    // Auto open when booking accepted
    const onBookingAccepted = (data) => {
      const otherUserId = currentRole === "seeker" ? data.providerId : data.seekerId;
      if (otherUserId) {
        openChatWithUser(
          typeof otherUserId === "object" ? otherUserId.toString() : otherUserId
        );
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

  // ── Reset unread when popup opens ─────────────────
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // ── Send message ──────────────────────────────────
  const handleSend = async () => {
    const content = messageText.trim();
    if (!content || !activeChat || sending) return;

    setSending(true);
    setMessageText("");

    // Stop typing
    const socket = getSocket();
    if (socket) socket.emit("stop_typing", { chatId: activeChat._id });

    try {
      const res = await axios.post(
        `${API}/api/messages`,
        { content, chatId: activeChat._id },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      // Message will also arrive via socket, but add it directly for instant UI
      setMessages((prev) => {
        const exists = prev.find((m) => m._id === res.data._id);
        return exists ? prev : [...prev, res.data];
      });
    } catch  {
      toast.error("Failed to send message");
      setMessageText(content); // Restore on error
    } finally {
      setSending(false);
    }
  };

  // ── Typing emit ───────────────────────────────────
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

  // ── Enter key to send ─────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Get other participant's name in a chat ────────
  const getOtherParticipant = (chat) => {
    if (!chat?.participants) return { name: "Unknown" };
    const other = chat.participants.find(
      (p) => p.user?._id !== currentUserId && p.user?.toString() !== currentUserId
    );
    return other?.user || { name: "Unknown" };
  };

  // ── Format time ───────────────────────────────────
  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  // ── Is message from current user ─────────────────
  const isMine = (msg) => {
    const senderId = msg.sender?.user?._id || msg.sender?.user;
    return senderId === currentUserId || senderId?.toString() === currentUserId;
  };

  return (
    <>
      {/* Floating button */}
      <button
        className="chat-fab"
        onClick={() => setIsOpen((o) => !o)}
        title="Open Chat"
      >
        💬
        {unreadCount > 0 && (
          <span className="chat-fab-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="chat-popup-window">

          {/* ── Left panel: Chat list ──────────────── */}
          <div className="chat-list-panel">
            <div className="chat-list-header">💬 Chats</div>

            {loadingChats ? (
              <div className="d-flex justify-content-center p-3">
                <div className="sw-spinner" style={{ width: 24, height: 24 }} />
              </div>
            ) : chats.length === 0 ? (
              <div style={{ padding: "16px", fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
                No chats yet.
                <br />
                Accept a booking to start chatting.
              </div>
            ) : (
              chats.map((chat) => {
                const other = getOtherParticipant(chat);
                const preview = chat.latestMessage?.content || "No messages yet";
                return (
                  <div
                    key={chat._id}
                    className={`chat-list-item ${activeChat?._id === chat._id ? "active" : ""}`}
                    onClick={() => handleSelectChat(chat)}
                  >
                    <div className="chat-list-name">
                      {other.name || other.userName || "User"}
                    </div>
                    <div className="chat-list-preview">{preview}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Right panel: Messages ──────────────── */}
          <div className="chat-msg-panel">
            {!activeChat ? (
              <div style={{
                flex: 1, display: "flex", alignItems: "center",
                justifyContent: "center", flexDirection: "column",
                gap: 8, color: "var(--text-muted)",
              }}>
                <div style={{ fontSize: "2rem" }}>💬</div>
                <div style={{ fontSize: "0.85rem" }}>Select a chat to start messaging</div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="chat-msg-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="sw-avatar" style={{ width: 28, height: 28, fontSize: "0.75rem" }}>
                      {getOtherParticipant(activeChat)?.name?.[0]?.toUpperCase() ||
                       getOtherParticipant(activeChat)?.userName?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span>
                      {getOtherParticipant(activeChat)?.name ||
                       getOtherParticipant(activeChat)?.userName || "User"}
                    </span>
                  </div>
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.9rem" }}
                    onClick={() => setIsOpen(false)}
                  >
                    ✕
                  </button>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                  {loadingMessages ? (
                    <div className="d-flex justify-content-center p-3">
                      <div className="sw-spinner" style={{ width: 24, height: 24 }} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 20 }}>
                      No messages yet. Say hello! 👋
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg._id}
                        className={`chat-bubble-wrapper ${isMine(msg) ? "sent" : "received"}`}
                      >
                        <div className={`chat-bubble ${isMine(msg) ? "sent" : "received"}`}>
                          {msg.content}
                        </div>
                        <div className="chat-bubble-time">
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="chat-bubble-wrapper received">
                      <div className="chat-bubble received" style={{ padding: "8px 14px" }}>
                        <div className="typing-indicator">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="chat-input-area">
                  <textarea
                    className="chat-input"
                    rows={1}
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={sending || !messageText.trim()}
                    title="Send"
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