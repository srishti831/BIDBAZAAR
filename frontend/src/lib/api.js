import axios from "axios";

// Set VITE_API_URL in your hosting dashboard, e.g. https://your-api.onrender.com/api/v1
export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

const TOKEN_KEY = "bidbazaar_token";

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const storeToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) - cookie auth still works */
  }
};

// Safari/iOS block third-party cookies, so we also send the JWT as a Bearer
// header. The backend accepts either the cookie or the header.
export const setupAxios = () => {
  axios.defaults.withCredentials = true;
  axios.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
};

// error.response is undefined on network errors / server cold starts.
export const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  (error?.code === "ERR_NETWORK"
    ? "Cannot reach the server. Please try again in a moment."
    : error?.message) ||
  "Something went wrong.";
