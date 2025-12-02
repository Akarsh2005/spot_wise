import { io } from "socket.io-client";

const BACKEND = "http://localhost:5001";

export const socket = io(BACKEND, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export const connectSocket = () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("seeker"));
  
  if (!token || !user) {
    console.warn("No token or user found for socket connection");
    return;
  }

  if (socket.connected) {
    socket.disconnect();
  }

  socket.auth = { token };
  socket.connect();

  socket.on("connect", () => {
    console.log("🟢 Socket connected");
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};