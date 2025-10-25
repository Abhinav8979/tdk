import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store"; // Import AppDispatch from the store
import { useSelector, TypedUseSelectorHook } from "react-redux";
import { RootState } from "@/redux/store"; // Import RootState from the store

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useAppDispatch = () => useDispatch<AppDispatch>();
