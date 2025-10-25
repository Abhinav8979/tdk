import ModalLayout from "@/layouts/ModalLayout";
import React from "react";
import "@/css/loader/primaryLoader.css";

const PrimaryLoader = () => {
  return (
    <ModalLayout>
      <div className="three-body">
        <div className="three-body__dot"></div>
        <div className="three-body__dot"></div>
        <div className="three-body__dot"></div>
      </div>
    </ModalLayout>
  );
};

export default PrimaryLoader;
