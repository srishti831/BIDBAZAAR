import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import { API_URL, getErrorMessage } from "@/lib/api";
import { syncServerTime } from "@/lib/time";

const emptyDetail = {
  auction: null,
  bidders: [],
  seller: null,
  winner: null,
  isOwner: false,
  minNextBid: 0,
  minIncrement: 0,
  error: null,
};

const auctionSlice = createSlice({
  name: "auction",
  initialState: {
    loading: false, // create / republish / delete in flight
    listLoaded: false,
    allAuctions: [],
    myAuctions: [],
    myAuctionsLoaded: false,
    watchlistItems: [],
    watchlistLoaded: false,
    detailLoading: false,
    detail: emptyDetail,
  },
  reducers: {
    busy(state) {
      state.loading = true;
    },
    idle(state) {
      state.loading = false;
    },
    allLoaded(state, action) {
      state.allAuctions = action.payload;
      state.listLoaded = true;
    },
    allFailed(state) {
      state.listLoaded = true;
    },
    myLoaded(state, action) {
      state.myAuctions = action.payload;
      state.myAuctionsLoaded = true;
    },
    myFailed(state) {
      state.myAuctionsLoaded = true;
    },
    watchlistLoaded(state, action) {
      state.watchlistItems = action.payload;
      state.watchlistLoaded = true;
    },
    detailRequest(state, action) {
      // Only blank the page for a first load / a different auction.
      if (!action.payload?.silent) {
        state.detailLoading = true;
        state.detail = emptyDetail;
      }
    },
    detailSuccess(state, action) {
      state.detailLoading = false;
      const d = action.payload;
      state.detail = {
        auction: d.auctionItem,
        bidders: d.bidders || [],
        seller: d.seller,
        winner: d.winner,
        isOwner: d.isOwner,
        minNextBid: d.minNextBid,
        minIncrement: d.minIncrement,
        error: null,
      };
    },
    detailFailed(state, action) {
      state.detailLoading = false;
      if (!state.detail.auction) {
        state.detail = { ...emptyDetail, error: action.payload };
      }
    },
  },
});

const a = auctionSlice.actions;

export const getAllAuctionItems =
  ({ silent = false } = {}) =>
  async (dispatch) => {
    try {
      const response = await axios.get(`${API_URL}/auctionitem/allitems`);
      syncServerTime(response.data.serverTime);
      dispatch(a.allLoaded(response.data.items));
    } catch (error) {
      dispatch(a.allFailed());
      if (!silent) console.error(getErrorMessage(error));
    }
  };

export const getMyAuctionItems = () => async (dispatch) => {
  try {
    const response = await axios.get(`${API_URL}/auctionitem/myitems`);
    syncServerTime(response.data.serverTime);
    dispatch(a.myLoaded(response.data.items));
  } catch (error) {
    dispatch(a.myFailed());
    toast.error(getErrorMessage(error));
  }
};

export const getWatchlist = () => async (dispatch) => {
  try {
    const response = await axios.get(`${API_URL}/user/watchlist`);
    syncServerTime(response.data.serverTime);
    dispatch(a.watchlistLoaded(response.data.items));
  } catch (error) {
    dispatch(a.watchlistLoaded([]));
    toast.error(getErrorMessage(error));
  }
};

export const getAuctionDetail =
  (id, { silent = false } = {}) =>
  async (dispatch) => {
    dispatch(a.detailRequest({ silent }));
    try {
      const response = await axios.get(`${API_URL}/auctionitem/auction/${id}`);
      syncServerTime(response.data.serverTime);
      dispatch(a.detailSuccess(response.data));
    } catch (error) {
      dispatch(a.detailFailed(getErrorMessage(error)));
    }
  };

// Each of these resolves to true/false so the page can react (close a modal, navigate...).
export const createAuction = (data) => async (dispatch) => {
  dispatch(a.busy());
  try {
    const response = await axios.post(`${API_URL}/auctionitem/create`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    toast.success(response.data.message);
    dispatch(getAllAuctionItems({ silent: true }));
    return response.data.auctionItem;
  } catch (error) {
    toast.error(getErrorMessage(error));
    return null;
  } finally {
    dispatch(a.idle());
  }
};

export const republishAuction = (id, data) => async (dispatch) => {
  dispatch(a.busy());
  try {
    const response = await axios.put(
      `${API_URL}/auctionitem/item/republish/${id}`,
      data
    );
    toast.success(response.data.message);
    await Promise.all([
      dispatch(getMyAuctionItems()),
      dispatch(getAllAuctionItems({ silent: true })),
    ]);
    return true;
  } catch (error) {
    toast.error(getErrorMessage(error));
    return false;
  } finally {
    dispatch(a.idle());
  }
};

export const deleteAuction = (id) => async (dispatch) => {
  dispatch(a.busy());
  try {
    const response = await axios.delete(`${API_URL}/auctionitem/delete/${id}`);
    toast.success(response.data.message);
    await Promise.all([
      dispatch(getMyAuctionItems()),
      dispatch(getAllAuctionItems({ silent: true })),
    ]);
    return true;
  } catch (error) {
    toast.error(getErrorMessage(error));
    return false;
  } finally {
    dispatch(a.idle());
  }
};

export default auctionSlice.reducer;
