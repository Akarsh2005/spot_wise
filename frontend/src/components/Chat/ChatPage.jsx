import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { socket, connectSocket, disconnectSocket } from "../../socket";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import "./ChatPage.css";

const API_URL = "http://localhost:5001";

const ChatPage = () => {
  const navigate = useNavigate();
  const { chatId: paramChatId } = useParams();
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  const user = JSON.parse(localStorage.getItem("seeker"));
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (user && token) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [user, token]);

  const fetchChats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(response.data);
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to load chats");
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchChats();
    } else {
      navigate("/");
    }
  }, [fetchChats, navigate, token]);

  useEffect(() => {
    socket.on("message_received", (newMessage) => {
      if (selectedChat && newMessage.chat === selectedChat._id) {
        setMessages(prev => [...prev, newMessage]);
      }
      fetchChats();
    });

    socket.on("booking_accepted", (data) => {
      toast.success("Booking accepted! Chat is now available.");
      fetchChats();
    });

    return () => {
      socket.off("message_received");
      socket.off("booking_accepted");
    };
  }, [selectedChat, fetchChats]);

  useEffect(() => {
    if (paramChatId && chats.length > 0) {
      const chat = chats.find(c => c._id === paramChatId);
      if (chat) {
        openChat(chat);
      }
    }
  }, [paramChatId, chats]);

  const openChat = async (chat) => {
    setSelectedChat(chat);
    setLoading(true);
    
    try {
      socket.emit("join_chat", chat._id);
      
      const response = await axios.get(`${API_URL}/api/messages/${chat._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setMessages(response.data);
    } catch (error) {
      console.error("Error opening chat:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedChat || !newMessage.trim()) return;

    try {
      await axios.post(
        `${API_URL}/api/messages`,
        {
          content: newMessage.trim(),
          chatId: selectedChat._id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const getOtherParticipant = (chat) => {
    if (!chat || !chat.participants) return null;
    return chat.participants.find(p => p.user._id !== user._id);
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-header">
            <h3>Messages</h3>
            <button 
              className="btn-back"
              onClick={() => navigate("/dashboard")}
            >
              ← Back
            </button>
          </div>
          <div className="chat-list">
            {chats.map((chat) => {
              const otherParticipant = getOtherParticipant(chat);
              return (
                <div
                  key={chat._id}
                  className={`chat-item ${selectedChat?._id === chat._id ? "active" : ""}`}
                  onClick={() => openChat(chat)}
                >
                  <div className="chat-partner-name">
                    {otherParticipant?.user?.userName || otherParticipant?.user?.name || "Unknown User"}
                  </div>
                  <div className="chat-last-message">
                    {chat.latestMessage?.content?.slice(0, 30) || "No messages yet"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="chat-main">
          {selectedChat ? (
            <div className="chat-box">
              {/* Chat Header */}
              <div className="chat-header">
                {getOtherParticipant(selectedChat) && (
                  <>
                    <div className="chat-partner-avatar">
                      {getOtherParticipant(selectedChat).user.userName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="chat-partner-info">
                      <h4>{getOtherParticipant(selectedChat).user.userName || getOtherParticipant(selectedChat).user.name}</h4>
                      <span className="status">Online</span>
                    </div>
                  </>
                )}
              </div>

              {/* Messages */}
              <div className="messages-container">
                {loading ? (
                  <div className="loading-spinner">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender.user._id === user._id;
                    
                    return (
                      <div
                        key={message._id}
                        className={`message ${isOwnMessage ? "own-message" : "other-message"}`}
                      >
                        <div className="message-content">
                          <p>{message.content}</p>
                          <span className="message-time">
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="message-input-form">
                <div className="input-group">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="message-input"
                  />
                  <button type="submit" className="send-button" disabled={!newMessage.trim()}>
                    Send
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="chat-placeholder">
              <h4>Select a chat to start messaging</h4>
              <p>Choose a conversation from the list to begin chatting with your service provider.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;