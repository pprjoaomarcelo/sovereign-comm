import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Inbox, Send, Settings, Wallet, MessageSquare } from "lucide-react";

interface NavbarProps {
  connected?: boolean;
  address?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const Navbar = ({ connected, address, onConnect, onDisconnect }: NavbarProps) => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg group-hover:shadow-[var(--shadow-glow)] transition-all">
              <MessageSquare className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              SovereignComm
            </span>
          </Link>

          {connected && (
            <div className="hidden md:flex items-center gap-1">
              <Link to="/inbox">
                <Button 
                  variant={isActive("/inbox") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                >
                  <Inbox className="w-4 h-4" />
                  Inbox
                </Button>
              </Link>
              <Link to="/send">
                <Button 
                  variant={isActive("/send") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </Link>
              <Link to="/settings">
                <Button 
                  variant={isActive("/settings") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-3">
            {connected ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg border border-border">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-mono text-foreground">{formatAddress(address!)}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onDisconnect}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button 
                className="gap-2 bg-primary hover:bg-primary/90 text-black font-semibold shadow-lg hover:shadow-[var(--shadow-glow)] transition-all"
                onClick={onConnect}
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
