// provider/src/components/Chat/ChatBox.jsx
import React, { useRef, useEffect } from "react";
import ChatInput from "./ChatInput";
// import "./ChatBox.css";

const ChatBox = ({ messages = [], onSend, currentUser, chat }) => {
  const scrollRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isOwn = (msg) => {
    const userId = currentUser?._id;
    // message structure: msg.sender.user._id (populated)
    if (msg.sender?.user) return msg.sender.user._id === userId;
    // fallback if msg.sender is id
    return msg.sender === userId;
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h4>{chat.participants?.map(p => p.user._id !== currentUser._id ? (p.user.name || p.user.userName) : null).filter(Boolean)[0] || "Chat"}</h4>
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m._id} ref={scrollRef} className={`message ${isOwn(m) ? "own" : "other"}`}>
            <div className="message-content">{m.content}</div>
            <div className="message-meta">{new Date(m.createdAt).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>

      <ChatInput onSend={onSend} />
    </div>
  );
};

export default ChatBox;
