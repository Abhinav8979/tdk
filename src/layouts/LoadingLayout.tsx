"use client";

import { useAppDispatch, useAppSelector } from "@/hooks/ReduxSelector";
import PrimaryLoader from "@/components/loader/PrimaryLoader";
import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { setLoading } from "@/redux/store/utils";

const LoadingLayout = ({ children }: { children: ReactNode }) => {
  const { loading } = useAppSelector((state) => state.utils);
  const dispatch = useAppDispatch();

  const pathname = usePathname();

  useEffect(() => {
    dispatch(setLoading(false));
  }, [pathname]);

  return (
    <>
      {loading && <PrimaryLoader />}
      {children}
    </>
  );
};

export default LoadingLayout;
