"use client";

import { ChildrenProps } from "@/types/ChildrenProps";
import { useAuthentication } from "@/contexts/Authentication";
import { Spinner } from "@/components/general/Spinner";

export default function MemberRootLayout({ children }: ChildrenProps) {
  const { user, isLoading } = useAuthentication();

  if (isLoading) {
    return <Spinner />;
  }

  if (user?.role !== "member") {
    return "Not allowed";
  }

  return children;
}
