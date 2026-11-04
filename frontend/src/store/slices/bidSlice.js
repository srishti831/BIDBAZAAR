import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import { getAuctionDetail, getAllAuctionItems } from "./auctionSlice";
import { API_URL, getErrorMessage } from "@/lib/api";
import { syncServerTime } from "@/lib/time";

const bidSlice = createSlice({
  name: "bid",
  initialState: {
    placing: false,
    myBids: [],
    myBidsLoaded: false,
  },
  reducers: {
    placing(state, action) {
      state.placing = action.payload;
    },
    myBidsLoaded(state, action) {
      state.myBids = action.payload;
      state.myBidsLoaded = true;
    },
  },
});

const a = bidSlice.actions;

// Resolves to { ok, extended }.
export const placeBid = (id, amount) => async (dispatch) => {
  dispatch(a.placing(true));
  try {
    const response = await axios.post(`${API_URL}/bid/place/${id}`, { amount });
    toast.success(response.data.message);
    await dispatch(getAuctionDetail(id, { silent: true }));
    dispatch(getAllAuctionItems({ silent: true }));
    return { ok: true, extended: response.data.extended };
  } catch (error) {
    toast.error(getErrorMessage(error));
    // Someone beat us to it (409) or the rules changed: show the fresh numbers.
    dispatch(getAuctionDetail(id, { silent: true }));
    return { ok: false };
  } finally {
    dispatch(a.placing(false));
  }
};

export const getMyBids = () => async (dispatch) => {
  try {
    const response = await axios.get(`${API_URL}/bid/mine`);
    syncServerTime(response.data.serverTime);
    dispatch(a.myBidsLoaded(response.data.items));
  } catch (error) {
    dispatch(a.myBidsLoaded([]));
    toast.error(getErrorMessage(error));
  }
};

export default bidSlice.reducer;
