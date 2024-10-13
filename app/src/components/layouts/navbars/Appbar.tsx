import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import React, { ReactElement, cloneElement } from "react";
import { Button } from "../../ui/button";

interface AppBarProps {
  showBurger: boolean;
  onBurgerClick: () => void;
  headerElement: ReactElement;
}

export const AppBar = ({
  showBurger,
  onBurgerClick,
  headerElement,
}: AppBarProps) => {

  return (
    <div className="flex z-10 justify-between items-center border-b-2 w-full sticky top-0 px-4 py-2 bg-gray-200 h-[65px]">
      <div className="flex items-center space-x-2">
        {!!showBurger && (
          <Button onClick={onBurgerClick} variant="link" className="pl-0 pr-2">
            <HamburgerMenuIcon className="w-5 h-5" />
          </Button>
        )}
        {cloneElement(headerElement)}
      </div>
    </div>
  );
};
