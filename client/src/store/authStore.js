import { createSlice, createAsyncThunk, configureStore } from '@reduxjs/toolkit';
import requestReducer from './requestStore';
import { sendOtp, verifyOtp, registerUser, loginUser, logoutUser, getMe } from '../api/authApi';
import { disconnectSocket } from '../socket/socketClient';

// Thunks
export const sendOTPThunk = createAsyncThunk(
  'auth/sendOTP',
  async ({ email, purpose }, { rejectWithValue }) => {
    try {
      const response = await sendOtp({ email, purpose });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send OTP');
    }
  }
);

export const verifyOTPThunk = createAsyncThunk(
  'auth/verifyOTP',
  async ({ email, otp, purpose }, { rejectWithValue }) => {
    try {
      const response = await verifyOtp({ email, otp, purpose });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to verify OTP');
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await registerUser(userData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Registration failed');
    }
  }
);

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await loginUser({ email, password });
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutUser();
      disconnectSocket();
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

export const getMeThunk = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMe();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get user data');
    }
  }
);

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  otpSent: false,
  otpVerified: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetOtpState: (state) => {
      state.otpSent = false;
      state.otpVerified = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // sendOTPThunk
      .addCase(sendOTPThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendOTPThunk.fulfilled, (state) => {
        state.isLoading = false;
        state.otpSent = true;
      })
      .addCase(sendOTPThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // verifyOTPThunk
      .addCase(verifyOTPThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTPThunk.fulfilled, (state) => {
        state.isLoading = false;
        state.otpVerified = true;
      })
      .addCase(verifyOTPThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // registerThunk
      .addCase(registerThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const payloadData = action.payload.data || action.payload;
        state.user = payloadData.user;
        state.token = payloadData.accessToken || payloadData.token;
        state.isAuthenticated = true;
        localStorage.setItem('token', state.token);
        localStorage.setItem('user', JSON.stringify(state.user));
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // loginThunk
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const payloadData = action.payload.data || action.payload;
        state.user = payloadData.user;
        state.token = payloadData.accessToken || payloadData.token;
        state.isAuthenticated = true;
        localStorage.setItem('token', state.token);
        localStorage.setItem('user', JSON.stringify(state.user));
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // logoutThunk
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.otpSent = false;
        state.otpVerified = false;
        state.error = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })

      // getMeThunk
      .addCase(getMeThunk.fulfilled, (state, action) => {
        const payloadData = action.payload.data || action.payload;
        state.user = payloadData.user || payloadData;
        state.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(state.user));
      })
      .addCase(getMeThunk.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  }
});

export const { clearError, resetOtpState } = authSlice.actions;

// Configure the store here for simplicity if this is the only slice right now
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    request: requestReducer
  }
});

export default store;
