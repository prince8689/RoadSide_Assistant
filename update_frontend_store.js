const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, 'client/src/store/requestStore.js');
let storeCode = fs.readFileSync(storePath, 'utf8');

const thunks = `
export const submitPaymentThunk = createAsyncThunk(
  'request/submitPayment',
  async ({ requestId, paymentMethod, receiptFile }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('payment_method', paymentMethod);
      if (receiptFile) formData.append('receipt', receiptFile);

      const res = await axiosInst.post(\`/requests/\${requestId}/submit-payment\`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data?.request;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit payment');
    }
  }
);

export const verifyPaymentThunk = createAsyncThunk(
  'request/verifyPayment',
  async (requestId, { rejectWithValue }) => {
    try {
      const res = await axiosInst.post(\`/requests/\${requestId}/verify-payment\`);
      return res.data?.request;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to verify payment');
    }
  }
);
`;

storeCode = storeCode.replace('const initialState = {', thunks + '\nconst initialState = {');
storeCode = storeCode.replace('.addCase(cancelRequestThunk.fulfilled, (state) => {', `
      .addCase(submitPaymentThunk.fulfilled, (state, action) => {
        state.activeRequest = action.payload;
      })
      .addCase(verifyPaymentThunk.fulfilled, (state, action) => {
        state.activeRequest = action.payload;
      })
      .addCase(cancelRequestThunk.fulfilled, (state) => {`);

fs.writeFileSync(storePath, storeCode);
console.log('Store updated');
