import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings as SettingsIcon } from "lucide-react";

interface NavbarProps {
  connected: boolean;
  address: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const Navbar = ({ connected, address, onConnect, onDisconnect }: NavbarProps) => {
  const navigate = useNavigate();
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="flex items-center justify-between p-4 border-b border-border">
      <Link to="/" className="text-lg font-bold">
        SovereignComm
      </Link>
      <div className="flex items-center gap-4">
        {connected ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${address}`} alt="User Avatar" />
                  <AvatarFallback>{address.slice(0, 2)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">Connected Wallet</p>
                <p className="text-xs leading-none text-muted-foreground font-mono">
                  {formatAddress(address)}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDisconnect}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={onConnect}>
            Connect Wallet
          </Button>
        )}
      </div>
    </nav>
  );
};