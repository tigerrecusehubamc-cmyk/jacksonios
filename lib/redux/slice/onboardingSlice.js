import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getOnboardingOptions } from "@/lib/api";

const initialState = {
  ageOptions: [],
  genderOptions: [],
  gamePreferencesOptions: [],
  gameStyleOptions: [],
  playerTypeOptions: [],
  status: "idle",
  error: null,
};

export const fetchOnboardingOptions = createAsyncThunk(
  "onboarding/fetchOptions",
  async (screenName, { rejectWithValue }) => {
    try {
      const data = await getOnboardingOptions(screenName);
      if (!data || !Array.isArray(data.options)) {
        throw new Error(`Invalid options format for ${screenName}`);
      }
      return { screenName, options: data.options };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    resetOnboardingOptions: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOnboardingOptions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchOnboardingOptions.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { screenName, options } = action.payload;

        switch (screenName) {
          case "age_range":
            state.ageOptions = options;
            break;
          case "gender":
            state.genderOptions = options;
            break;
          case "game_preferences":
            state.gamePreferencesOptions = options;
            break;
          case "game_style":
            state.gameStyleOptions = options;
            break;
          case "dealy_game": // Corresponds to your "Player Type"
            state.playerTypeOptions = options;
            break;
          default:
            break;
        }
      })
      .addCase(fetchOnboardingOptions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { resetOnboardingOptions } = onboardingSlice.actions;
export default onboardingSlice.reducer;
