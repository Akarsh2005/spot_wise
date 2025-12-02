// seeker/src/components/Chat/ChatInput.jsx
import React, { useState } from "react";
// import "./ChatInput.css";

const ChatInput = ({ onSend }) => {
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="chat-input">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
      <button onClick={submit}>Send</button>
    </div>
  );
};

export default ChatInput;
