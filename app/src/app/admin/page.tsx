import "server-only";

import { Metadata } from "next";
import React from "react";
import { OwnedObjectsGrid } from "@/components/general/OwnedObjectsGrid";

export const metadata: Metadata = {
  title: "PoC Template for Admins",
};

const AdminHomePage = () => {
  return <OwnedObjectsGrid />;
};

export default AdminHomePage;
