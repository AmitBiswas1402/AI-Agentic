import React from "react";

const MainLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return <div className="mt-16 h-[calc(100dvh-4rem)] overflow-hidden">{children}</div>;
};

export default MainLayout;