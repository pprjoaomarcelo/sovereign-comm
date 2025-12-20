import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch, SwitchProps } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/hooks/useSession";
import { Settings as SettingsIcon, Bell, Lock, Eye, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NetworkBadge } from "@/components/NetworkBadge";
import type { detectNetwork } from "@/lib/mockData";

// Helper to manage settings in localStorage
const useSetting = <T,>(key: string, defaultValue: T): [T, (value: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return defaultValue;
    }
  });

  const setStoredValue = (newValue: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(newValue));
      setValue(newValue);
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  };

  return [value, setStoredValue];
};

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState<ReturnType<typeof detectNetwork>>("unknown");

  const resetSession = useSessionStore((state) => state.resetSession);
  const [publicMode, setPublicMode] = useSetting<boolean>('settings:publicMode', true);
  const [notifications, setNotifications] = useSetting<boolean>('settings:notifications', false);
  const [autoRefresh, setAutoRefresh] = useSetting<boolean>('settings:autoRefresh', true);

  useEffect(() => {
    const walletData = sessionStorage.getItem('wallet');
    if (walletData) {
      const parsed = JSON.parse(walletData);
      setConnected(parsed.connected);
      setAddress(parsed.address);
      setNetwork(parsed.network);
    }
  }, []);

  const handleConnect = () => {
    navigate("/connect");
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem('wallet');
    resetSession();
    setConnected(false);
    navigate("/");
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been saved locally.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        connected={connected}
        address={address}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account, preferences, and privacy
          </p>
        </div>

        {connected && (
          <Card className="p-6 mb-6 bg-card/50 backdrop-blur-sm">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Connected Wallet
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Address</p>
                  <p className="font-mono text-sm">{address}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Network</p>
                  <NetworkBadge network={network} />
                </div>
              </div>
            </div>
          </Card>
        )}

        {connected && (
          <Card className="p-6 mb-6 bg-card/50 backdrop-blur-sm">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Gem className="w-4 h-4 text-primary" />
              Subscription & Usage
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                  <p className="font-semibold">Freemium</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/upgrade')}>
                  Upgrade
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <h3 className="font-semibold mb-6 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Privacy & Display
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="space-y-1">
                <Label htmlFor="public-mode" className="cursor-pointer font-medium">Public Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Show all public messages without encryption
                </p>
              </div>
              <Switch
                id="public-mode"
                checked={publicMode}
                onCheckedChange={setPublicMode}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="space-y-1">
                <Label htmlFor="auto-refresh" className="cursor-pointer font-medium">Auto-refresh Inbox</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically scan for new messages every 30s
                </p>
              </div>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm mt-6">
          <h3 className="font-semibold mb-6 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="space-y-1">
                <Label htmlFor="notifications" className="cursor-pointer font-medium">Enable Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when new messages arrive
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            {notifications && (
              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm text-muted-foreground">
                Browser notifications require permission. You'll be prompted to allow them.
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => navigate('/inbox')}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveSettings}
            className="gap-2 bg-primary hover:bg-primary/90 text-black"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
