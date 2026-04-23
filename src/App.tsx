import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import MyEvents from "./pages/MyEvents";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import NotFound from "./pages/NotFound";
import { DebugErrorThrower } from "./components/DebugErrorThrower";
import { ErrorDebugPopup } from "./components/ErrorDebugPopup";

const DebugTools = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (!isAdminRoute) {
    return null;
  }

  return (
    <>
      <DebugErrorThrower />
      <ErrorDebugPopup />
    </>
  );
};

const App = () => (
  <TooltipProvider>
    <DebugTools />
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/" element={<Discover />} />
      <Route path="/event/:id" element={<Index />} />
      <Route path="/event/:id/edit" element={<EditEvent />} />
      <Route path="/my-events" element={<MyEvents />} />
      <Route path="/create-event" element={<CreateEvent />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin" element={<Admin />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </TooltipProvider>
);

export default App;
