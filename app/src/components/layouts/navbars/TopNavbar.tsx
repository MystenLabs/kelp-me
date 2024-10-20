import React from "react";
import { NavbarHeader } from "./NavbarHeader";
import { NavbarLinks } from "./NavbarLinks";
import { UserProfileMenu } from "@/components/general/UserProfileMenu";
import { UserAvatar } from "@/components/general/UserAvatar";
import { useAuthentication } from "@/contexts/Authentication";
import { USER_ROLES } from "@/constants/USER_ROLES";
import clientConfig from "@/config/clientConfig";

export const TopNavbar = () => {
  const { user } = useAuthentication();

  return (
    <div className="sticky top-0 flex w-full h-full bg-primary p-5 space-x-4 justify-between items-center">
      <NavbarHeader showCloseButton={false} onClose={() => {}} />
      <NavbarLinks position="top" />
      <div className="flex justify-end items-center space-x-1">
        {user?.role !== USER_ROLES.ROLE_4 &&
          clientConfig.USE_TOP_NAVBAR_IN_LARGE_SCREEN && (
            <UserProfileMenu
              trigger={<UserAvatar user={user} showNameEmail={false} />}
            />
          )}
      </div>
    </div>
  );
};
