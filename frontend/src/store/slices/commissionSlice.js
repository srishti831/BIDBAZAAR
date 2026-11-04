import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import { API_URL, getErrorMessage } from "@/lib/api";
import { fetchUser } from "./userSlice";

const commissionSlice = createSlice({
  name: "commission",
  initialState: {
    loading: false,
    loaded: false,
    unpaidCommission: 0,
    commissionRate: 0.05,
    proofs: [],
  },
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload;
    },
    summaryLoaded(state, action) {
      state.loaded = true;
      state.unpaidCommission = action.payload.unpaidCommission;
      state.commissionRate = action.payload.commissionRate;
      state.proofs = action.payload.proofs;
    },
  },
});

const a = commissionSlice.actions;

export const getMyCommission = () => async (dispatch) => {
  try {
    const response = await axios.get(`${API_URL}/commission/mine`);
    dispatch(a.summaryLoaded(response.data));
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
};

export const postCommissionProof = (data) => async (dispatch) => {
  dispatch(a.setLoading(true));
  try {
    const response = await axios.post(`${API_URL}/commission/proof`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    toast.success(response.data.message);
    dispatch(getMyCommission());
    dispatch(fetchUser({ silent: true }));
    return !!response.data.commissionProof;
  } catch (error) {
    toast.error(getErrorMessage(error));
    return false;
  } finally {
    dispatch(a.setLoading(false));
  }
};

export default commissionSlice.reducer;
