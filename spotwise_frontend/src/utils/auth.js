// utils/auth.js
import jwtDecode from "jwt-decode";
import { disconnectSocket } from "./socket";

const TOKEN_KEY = "spotwise_token";

// ✅ Save token to localStorage
export const saveToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

// ✅ Get token from localStorage
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// ✅ Decode token → returns { id, role } or null
export const decodeToken = () => {
  const token = getToken();
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

// ✅ Get role → "seeker" | "provider" | null
export const getRole = () => {
  const decoded = decodeToken();
  return decoded?.role || null;
};

// ✅ Get user id from token
export const getUserId = () => {
  const decoded = decodeToken();
  return decoded?.id || null;
};

// ✅ Check if user is logged in (token exists + not expired)
export const isLoggedIn = () => {
  const decoded = decodeToken();
  if (!decoded) return false;
  // Check token expiry
  const now = Date.now() / 1000;
  return decoded.exp > now;
};

// ✅ Logout — clear storage + disconnect socket
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  disconnectSocket();
};