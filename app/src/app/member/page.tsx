import "server-only";

import { Metadata } from "next";
import React from "react";
import { OwnedObjectsGrid } from "@/components/general/OwnedObjectsGrid";

export const metadata: Metadata = {
  title: "PoC Template for Members",
};

const MemberHomePage = () => {
  return <OwnedObjectsGrid />
};

export default MemberHomePage;
