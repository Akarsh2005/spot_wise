// provider_ui/src/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

// Initialize socket connection
export const initializeSocket = () => {
  const token = localStorage.getItem("token");
  const provider = JSON.parse(localStorage.getItem("provider"));
  
  if (!token || !provider) {
    console.warn("No token or provider found for socket connection");
    return;
  }

  if (socket.connected) {
    socket.disconnect();
  }

  socket.auth = { token };
  socket.connect();

  socket.on("connect", () => {
    console.log("🟢 Provider socket connected");
  });

  socket.on("disconnect", () => {
    console.log("🔴 Provider socket disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("Provider socket connection error:", error);
  });
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};