// provider/src/components/Chat/ChatList.jsx
import React from "react";
// import "./ChatList.css";

const ChatList = ({ chats = [], openChat, selectedChat }) => {
  // ✅ Determine the "other" user's name for the provider
  const otherName = (chat) => {
    const meId = JSON.parse(localStorage.getItem("provider"))?._id;
    const other = chat.participants.find((p) => p.user._id !== meId);
    return other?.user?.userName || other?.user?.email || "Unknown";
  };

  return (
    <div className="chat-list">
      <h4>Chats</h4>

      {chats.length === 0 && <p>No chats</p>}

      {chats.map((chat) => (
        <div
          key={chat._id}
          className={`chat-item ${
            selectedChat?._id === chat._id ? "active" : ""
          }`}
          onClick={() => openChat(chat)}
        >
          <div className="chat-item-left">
            <div className="chat-name">{otherName(chat)}</div>
            <div className="chat-last">
              {chat.latestMessage?.content?.slice(0, 40) ||
                "Start a conversation"}
            </div>
          </div>

          <div className="chat-item-right">
            <div className="chat-time">
              {chat.updatedAt
                ? new Date(chat.updatedAt).toLocaleDateString()
                : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatList;
