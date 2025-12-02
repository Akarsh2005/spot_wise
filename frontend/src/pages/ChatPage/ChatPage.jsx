import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./chatPage.css";

const socket = io("http://localhost:5001");

const ChatPage = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchChats = async () => {
      const res = await axios.get("http://localhost:5001/api/chat", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(res.data);
    };
    fetchChats();
  }, []);

  const openChat = async (chat) => {
    setSelectedChat(chat);
    socket.emit("joinChat", chat._id);
    const res = await axios.get(`http://localhost:5001/api/message/${chat._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(res.data);
  };

  const sendMessage = async () => {
    if (!content.trim()) return;
    const res = await axios.post(
      "http://localhost:5001/api/message",
      { content, chatId: selectedChat._id },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    socket.emit("sendMessage", { chatId: selectedChat._id, message: res.data });
    setMessages([...messages, res.data]);
    setContent("");
  };

  useEffect(() => {
    socket.on("receiveMessage", (message) => {
      if (selectedChat && message.chat._id === selectedChat._id) {
        setMessages((prev) => [...prev, message]);
      }
    });
  }, [selectedChat]);

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <h3>Chats</h3>
        {chats.map((chat) => (
          <div
            key={chat._id}
            className={`chat-item ${selectedChat?._id === chat._id ? "active" : ""}`}
            onClick={() => openChat(chat)}
          >
            {chat.chatName || "Chat"}
          </div>
        ))}
      </div>

      <div className="chat-box">
        {selectedChat ? (
          <>
            <div className="messages">
              {messages.map((m) => (
                <div key={m._id} className="message">
                  <strong>{m.sender.name}:</strong> {m.content}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="Type message..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <p>Select a chat to start messaging</p>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
