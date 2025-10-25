import React, { ReactNode } from "react";

const ModalLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="fixed h-screen w-screen z-[100] p-2 inset-0 flex bg-black/50 backdrop-blur-xs items-center justify-center">
      {children}
    </div>
  );
};

export default ModalLayout;
