import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthentication } from "@/contexts/Authentication";
import { CopyIcon, DotsVerticalIcon } from "@radix-ui/react-icons";
import { formatAddress } from "@mysten/sui/utils";
import toast from "react-hot-toast";
import { useRequestSui } from "@/hooks/useRequestSui";
import { LoadingButton } from "./LoadingButton";
import { formatAmount } from "@/helpers/formatAmount";
import BigNumber from "bignumber.js";
import { useCustomWallet } from "@/contexts/CustomWallet";

interface UserProfileMenuProps {
  trigger?: React.ReactNode;
}

export const UserProfileMenu = ({ trigger }: UserProfileMenuProps) => {
  const { user, handleLogout } = useAuthentication();
  const { address, logout: walletLogout } = useCustomWallet();
  const { handleRequestSui, isLoading, balance } = useRequestSui();

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address!);
    toast.success("Address copied to clipboard");
  };

  if (!address) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="link" className="text-contrast w-[80px] min-h-[50px]">
          {trigger || <DotsVerticalIcon />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>
          <div>
            {user.firstName} {user.lastName}
          </div>
          <div className="text-black text-opacity-60 text-xs">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="flex items-center justify-between w-full">
            <div>{formatAddress(address)}</div>
            <button onClick={handleCopyAddress}>
              <CopyIcon className="w-4 h-4 text-black" />
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center justify-between w-full">
            <div>{formatAmount(BigNumber(balance))} SUI</div>
            <LoadingButton onClick={handleRequestSui} isLoading={isLoading}>
              Request SUI
            </LoadingButton>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuItem
          onClick={() => {
            walletLogout();
            handleLogout();
          }}
          className="flex items-center justify-between w-full"
        >
          <div>Log out</div>
          <LogOut className="h-4 w-4" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
