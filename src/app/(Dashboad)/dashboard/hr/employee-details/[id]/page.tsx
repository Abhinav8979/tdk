import EmployeeDetailsPage from "@/components/dashboard/hr/employee details/EmployeeDetails";
import React from "react";

interface PageProps {
  params: {
    id: string;
  };
}

const Page = async ({ params }: PageProps) => {
  const param = await params;
  const { id } = param;
  return (
    <>
      <EmployeeDetailsPage id={id} />
    </>
  );
};

export default Page;
