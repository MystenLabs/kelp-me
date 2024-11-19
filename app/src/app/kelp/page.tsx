import "server-only";

import { Metadata } from "next";
import React from "react";
import { OwnedObjectsGrid } from "@/components/general/OwnedObjectsGrid";

export const metadata: Metadata = {
  title: "KELPme.io",
};

const MemberHomePage = () => {
  return <OwnedObjectsGrid />
};

export default MemberHomePage;
