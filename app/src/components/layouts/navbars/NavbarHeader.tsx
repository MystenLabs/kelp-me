import React from "react";
import { Button } from "../../ui/button";
import { ArrowLeft } from "lucide-react";
import { AppLogo } from "./AppLogo";

interface NavbarHeaderProps {
  showCloseButton: boolean;
  onClose: () => void;
}

export const NavbarHeader = ({
  showCloseButton,
  onClose,
}: NavbarHeaderProps) => {
  return (
    <div className="space-y-1 flex flex-col">
      <div className="flex justify-between items-center">
        <AppLogo />
        {!!showCloseButton && (
          <Button onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
