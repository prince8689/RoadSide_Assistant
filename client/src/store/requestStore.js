import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getActiveRequest, getMyRequests } from '../api/requestApi';
import axiosInst from '../api/axios';

export const fetchActiveRequestThunk = createAsyncThunk(
  'request/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getActiveRequest();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch active request');
    }
  }
);

export const fetchMyRequestsThunk = createAsyncThunk(
  'request/fetchMyRequests',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getMyRequests();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch requests');
    }
  }
);

export const fetchNearbyMechanicsThunk = createAsyncThunk(
  'request/fetchNearbyMechanics',
  async ({ lat, lng, radius, serviceType }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ lat, lng });
      if (radius) params.append('radius', radius);
      if (serviceType) params.append('serviceType', serviceType);
      
      const res = await axiosInst.get(`/search/nearby?${params.toString()}`);
      return res.data.data.mechanics;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch nearby mechanics');
    }
  }
);

export const updateUserLocationThunk = createAsyncThunk(
  'request/updateUserLocation',
  async ({ lat, lng }, { rejectWithValue }) => {
    try {
      await axiosInst.post('/search/update-location', { lat, lng });
      return { lat, lng };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update location');
    }
  }
);

export const createServiceRequestThunk = createAsyncThunk(
  'request/createServiceRequest',
  async (requestData, { rejectWithValue }) => {
    try {
      const res = await axiosInst.post('/requests', requestData);
      return res.data.data.request;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create request');
    }
  }
);

export const cancelRequestThunk = createAsyncThunk(
  'request/cancelRequest',
  async ({ requestId, reason }, { rejectWithValue }) => {
    try {
      await axiosInst.put(`/requests/${requestId}/cancel`, { reason });
      return requestId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to cancel request');
    }
  }
);

const initialState = {
  activeRequest: null,
  requests: [],
  mechanicLocation: null,
  nearbyMechanics: [],
  selectedMechanic: null,
  userLocation: null,
  requestHistory: [],
  isLoading: false,
  isLoadingNearby: false,
  nearbyError: null,
  error: null
};

const requestSlice = createSlice({
  name: 'request',
  initialState,
  reducers: {
    setUserLocation: (state, action) => {
      state.userLocation = action.payload;
    },
    setMechanicLocation: (state, action) => {
      state.mechanicLocation = action.payload;
    },
    setSelectedMechanic: (state, action) => {
      state.selectedMechanic = action.payload;
    },
    clearActiveRequest: (state) => {
      state.activeRequest = null;
      state.mechanicLocation = null;
    },
    updateActiveRequest: (state, action) => {
      if (state.activeRequest) {
        state.activeRequest = { 
          ...state.activeRequest, 
          status: action.payload.newStatus, 
          ...action.payload 
        };
      }
    },
    updateNearbyMechanicLocation: (state, action) => {
      const { mechanicId, lat, lng } = action.payload;
      const mechanic = state.nearbyMechanics.find(m => m.mechanic_id === mechanicId);
      if (mechanic) {
        mechanic.latitude = lat;
        mechanic.longitude = lng;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Active Request
      .addCase(fetchActiveRequestThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchActiveRequestThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeRequest = action.payload || null;
      })
      .addCase(fetchActiveRequestThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch My Requests
      .addCase(fetchMyRequestsThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMyRequestsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.requests = action.payload || [];
      })
      .addCase(fetchMyRequestsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Fetch Nearby Mechanics
      .addCase(fetchNearbyMechanicsThunk.pending, (state) => {
        state.isLoadingNearby = true;
        state.nearbyError = null;
      })
      .addCase(fetchNearbyMechanicsThunk.fulfilled, (state, action) => {
        state.isLoadingNearby = false;
        state.nearbyMechanics = action.payload || [];
      })
      .addCase(fetchNearbyMechanicsThunk.rejected, (state, action) => {
        state.isLoadingNearby = false;
        state.nearbyError = action.payload;
      })

      // Update User Location
      .addCase(updateUserLocationThunk.fulfilled, (state, action) => {
        state.userLocation = action.payload;
      })

      // Create Request
      .addCase(createServiceRequestThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createServiceRequestThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeRequest = action.payload;
      })
      .addCase(createServiceRequestThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Cancel Request
      .addCase(cancelRequestThunk.fulfilled, (state) => {
        state.activeRequest = null;
        state.mechanicLocation = null;
      });
  }
});

export const { 
  setUserLocation, 
  setMechanicLocation, 
  setSelectedMechanic, 
  clearActiveRequest, 
  updateActiveRequest,
  updateNearbyMechanicLocation
} = requestSlice.actions;

export default requestSlice.reducer;
