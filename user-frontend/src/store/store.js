// store/store.js
import { configureStore } from "@reduxjs/toolkit";
import movieReducer from "./slices/movieSlice";

const store = configureStore({
  reducer: {
    movies: movieReducer,
  },
});

export default store;
