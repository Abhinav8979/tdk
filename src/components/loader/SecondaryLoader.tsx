import React from "react";
import "@/css/loader/secondaryLoader.css";

const SecondaryLoader = () => {
  return (
    <div className="loader-wrapper scale-90 w-[120px]  h-[20px] relative flex items-center justify-center">
      <div className="circle-loader"></div>
      <div className="circle-loader delay-1"></div>
      <div className="circle-loader delay-2"></div>
      <div className="shadow-loader"></div>
      <div className="shadow-loader delay-1"></div>
      <div className="shadow-loader delay-2"></div>
    </div>
  );
};

export default SecondaryLoader;
