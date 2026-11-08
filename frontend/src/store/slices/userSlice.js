import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import { API_URL, getErrorMessage, storeToken } from "@/lib/api";

const userSlice = createSlice({
  name: "user",
  initialState: {
    loading: false,
    saving: false,
    isAuthenticated: false,
    authChecked: false,
    user: {},
    leaderboard: [],
    leaderboardLoaded: false,
  },
  reducers: {
    request(state) {
      state.loading = true;
    },
    authSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.authChecked = true;
      state.user = action.payload;
    },
    authFailed(state) {
      state.loading = false;
      state.isAuthenticated = false;
      state.authChecked = true;
      state.user = {};
    },
    loggedOut(state) {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = {};
    },
    saving(state, action) {
      state.saving = action.payload;
    },
    userUpdated(state, action) {
      state.user = action.payload;
    },
    watchlistUpdated(state, action) {
      state.user.watchlist = action.payload;
    },
    leaderboardLoaded(state, action) {
      state.leaderboard = action.payload;
      state.leaderboardLoaded = true;
    },
  },
});

const a = userSlice.actions;

const authRequest = (path, data, headers) => async (dispatch) => {
  dispatch(a.request());
  try {
    const response = await axios.post(`${API_URL}/user/${path}`, data, { headers });
    storeToken(response.data.token);
    dispatch(a.authSuccess(response.data.user));
    toast.success(response.data.message);
    return true;
  } catch (error) {
    dispatch(a.authFailed());
    toast.error(getErrorMessage(error));
    return false;
  }
};

export const register = (data) =>
  authRequest("register", data, { "Content-Type": "multipart/form-data" });

export const login = (data) =>
  authRequest("login", data, { "Content-Type": "application/json" });

export const logout = () => async (dispatch) => {
  try {
    const response = await axios.get(`${API_URL}/user/logout`);
    toast.success(response.data.message);
  } catch (error) {
    toast.error(getErrorMessage(error));
  } finally {
    storeToken(null);
    dispatch(a.loggedOut());
  }
};

// silent=true re-reads the account (e.g. after a sale) without touching auth state.
export const fetchUser =
  ({ silent = false } = {}) =>
  async (dispatch) => {
    if (!silent) dispatch(a.request());
    try {
      const response = await axios.get(`${API_URL}/user/me`);
      dispatch(a.authSuccess(response.data.user));
    } catch (error) {
      if (error?.response?.status === 401) storeToken(null);
      if (!silent) dispatch(a.authFailed());
    }
  };

const save = (method, path, data, headers) => async (dispatch) => {
  dispatch(a.saving(true));
  try {
    const response = await axios({ method, url: `${API_URL}/user/${path}`, data, headers });
    if (response.data.token) storeToken(response.data.token);
    if (response.data.user) dispatch(a.userUpdated(response.data.user));
    toast.success(response.data.message);
    return true;
  } catch (error) {
    toast.error(getErrorMessage(error));
    return false;
  } finally {
    dispatch(a.saving(false));
  }
};

export const updateProfile = (formData) =>
  save("put", "me/update", formData, { "Content-Type": "multipart/form-data" });

export const updatePayout = (data) =>
  save("put", "me/payout", data, { "Content-Type": "application/json" });

export const changePassword = (data) =>
  save("put", "me/password", data, { "Content-Type": "application/json" });

export const toggleWatch = (id) => async (dispatch) => {
  try {
    const response = await axios.post(`${API_URL}/user/watchlist/${id}`);
    dispatch(a.watchlistUpdated(response.data.watchlist));
    toast.success(response.data.message);
    return true;
  } catch (error) {
    toast.error(getErrorMessage(error));
    return false;
  }
};

export const fetchLeaderboard = () => async (dispatch) => {
  try {
    const response = await axios.get(`${API_URL}/user/leaderboard`);
    dispatch(a.leaderboardLoaded(response.data.leaderboard));
  } catch (error) {
    dispatch(a.leaderboardLoaded([]));
    console.error(getErrorMessage(error));
  }
};

export default userSlice.reducer;
