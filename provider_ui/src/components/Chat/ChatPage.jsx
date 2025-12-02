// provider/ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { socket, initializeSocket } from "../../socket";
import { toast } from "react-toastify";
import "./ChatPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const ChatPage = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(true);
  const messagesEndRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("provider") || "{}");
  const token = localStorage.getItem("token");

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket: Real-time messages
  useEffect(() => {
    if (!user?._id) {
      toast.error("User not found. Please log in.");
      return;
    }

    initializeSocket(user._id);

    const handleNewMessage = (newMsg) => {
      if (selectedChat?._id === newMsg.chat._id) {
        setMessages((prev) => [...prev, newMsg]);
      } else {
        setChats((prev) =>
          prev.map((c) =>
            c._id === newMsg.chat._id ? { ...c, latestMessage: newMsg } : c
          )
        );
        toast.info(`New message from ${getSenderName(newMsg.sender)}`);
      }
    };

    socket.on("message received", handleNewMessage);

    return () => socket.off("message received", handleNewMessage);
  }, [selectedChat, user]);

  // Fetch chats
  const fetchChats = async () => {
    if (!token) return;
    try {
      setFetchingChats(true);
      const { data } = await axios.get(`${API_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(data || []);
    } catch (err) {
      toast.error("Failed to load chats");
    } finally {
      setFetchingChats(false);
    }
  };

  // Open chat
  const openChat = async (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    try {
      const { data } = await axios.get(`${API_URL}/api/messages/${chat._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(data || []);
      socket.emit("join chat", chat._id);
    } catch (err) {
      toast.error("Failed to load messages");
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const tempId = Date.now();
    const optimisticMsg = {
      _id: tempId,
      content: newMessage,
      sender: { _id: user._id, userName: user.userName },
      chat: selectedChat,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${API_URL}/api/messages`,
        { content: newMessage, chatId: selectedChat._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      socket.emit("new message", data);
      setMessages((prev) => prev.filter((m) => m._id !== tempId).concat(data));
    } catch (err) {
      toast.error("Failed to send");
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const getSenderName = (sender) => {
    return sender?._id === user._id ? "You" : sender?.userName || "User";
  };

  const getChatPartner = (chat) => {
    if (!chat?.users || !Array.isArray(chat.users)) return null;
    return chat.users.find((u) => u._id !== user._id) || chat.users[0];
  };

  useEffect(() => {
    fetchChats();
  }, []);

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-header">
            <h3>Messages</h3>
          </div>

          <div className="chat-list">
            {fetchingChats ? (
              <div className="loading">Loading chats...</div>
            ) : chats.length === 0 ? (
              <div className="no-chats">No conversations yet</div>
            ) : (
              chats.map((chat) => {
                const partner = getChatPartner(chat);
                const lastMsg = chat.latestMessage;

                return (
                  <div
                    key={chat._id}
                    className={`chat-item ${selectedChat?._id === chat._id ? "active" : ""}`}
                    onClick={() => openChat(chat)}
                  >
                    <div className="chat-partner-avatar">
                      {partner?.userName?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="chat-info">
                      <div className="chat-partner-name">
                        {partner?.userName || "Unknown User"}
                      </div>
                      <div className="chat-last-message">
                        {lastMsg ? (
                          <>
                            <strong>{getSenderName(lastMsg.sender)}:</strong>{" "}
                            {lastMsg.content.length > 30
                              ? lastMsg.content.slice(0, 30) + "..."
                              : lastMsg.content}
                          </>
                        ) : (
                          "No messages yet"
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat */}
        <div className="chat-main">
          {selectedChat ? (
            <div className="chat-box">
              {/* Header */}
              <div className="chat-header">
                <div className="chat-partner-info">
                  <div className="chat-partner-avatar">
                    {getChatPartner(selectedChat)?.userName?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <h4>{getChatPartner(selectedChat)?.userName || "User"}</h4>
                    <span className="status">Online</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="no-messages">Say hello 👋</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`message ${msg.sender._id === user._id ? "own-message" : "other-message"}`}
                    >
                      <div className="message-content">
                        <p>{msg.content}</p>
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form className="message-input-form" onSubmit={sendMessage}>
                <div className="input-group">
                  <input
                    type="text"
                    className="message-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="send-button"
                    disabled={loading || !newMessage.trim()}
                  >
                    {loading ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="chat-placeholder">
              <h3>Welcome to Chat</h3>
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;