import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Connect from "./pages/Connect";
import Inbox from "./pages/Inbox";
import Send from "./pages/Send";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Upgrade from "./pages/Upgrade";

const App = () => (
  <>
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/connect" element={<Connect />} />
      <Route path="/inbox" element={<Inbox />} />
      <Route path="/send" element={<Send />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

export default App;
