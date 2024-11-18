import "server-only";

import { Metadata } from "next";
import React from "react";
import { OwnedObjectsGrid } from "@/components/general/OwnedObjectsGrid";
import Ribbon from "@/components/ui/Ribbon";

export const metadata: Metadata = {
  title: "PoC Template for Admins",
};

const AdminHomePage = () => {
  return (
    <>
      <Ribbon />
      <OwnedObjectsGrid />
    </>
  );
};

export default AdminHomePage;
