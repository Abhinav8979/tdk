import PayslipGenerator from "@/components/dashboard/hr/expenses/PayslipGenerator";
import React from "react";

const page = async ({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { month: string; year: string };
}) => {
  const { month, year } = await searchParams;
  const { id } = await params;
  return (
    <>
      <PayslipGenerator month={month} year={year} id={id} />
    </>
  );
};

export default page;
