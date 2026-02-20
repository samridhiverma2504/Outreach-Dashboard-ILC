import React, { useState } from "react";
import { EmailGenerator } from "./components/dashboard/EmailGenerator";
import { ReservationTracker } from "./components/dashboard/ReservationTracker";
import { InventoryTracker } from "./components/dashboard/InventoryTracker";
import { MeetingNotes } from "./components/dashboard/MeetingNotes";
import {
  Mail,
  CalendarCheck,
  Package,
  FileText,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import ilcLogo from "./ilc-logo.png";

type View =
  | "email-gen"
  | "reservations"
  | "inventory"
  | "notes";

function App() {
  const [activeView, setActiveView] = useState<View>("reservations");
  const [emailGeneratorTab, setEmailGeneratorTab] = useState<"presentations" | "catering">("presentations");

  const handleNavigateToEmailGenerator = (tab: "presentations" | "catering") => {
    setEmailGeneratorTab(tab);
    setActiveView("email-gen");
  };

  const renderContent = () => {
    switch (activeView) {
      case "reservations":
        return <ReservationTracker onNavigateToEmailGenerator={handleNavigateToEmailGenerator} />;
      case "email-gen":
        return <EmailGenerator initialTab={emailGeneratorTab} />;
      case "inventory":
        return <InventoryTracker />;
      case "notes":
        return <MeetingNotes />;
      default:
        return <EmailGenerator />;
    }
  };

  const NavItem = ({
    view,
    icon: Icon,
    label,
  }: {
    view: View;
    icon: any;
    label: string;
  }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-xs font-medium transition-colors ${
        activeView === view
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/20 flex flex-col fixed inset-y-0 left-0 z-10">
        <div className="p-6">
          <div className="flex flex-col items-center space-y-1">
            {/* ILC Logo */}
            <img src={ilcLogo} alt="ILC Logo" className="w-12 h-12 object-contain" />
            <div className="text-center">
              <p className="font-bold text-xl text-primary">Outreach Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem
            view="reservations"
            icon={CalendarCheck}
            label="Event Tracker"
          />
          <NavItem
            view="email-gen"
            icon={Mail}
            label="Email Generator"
          />
          <NavItem
            view="notes"
            icon={FileText}
            label="Meeting Notes & Agendas"
          />
          <NavItem
            view="inventory"
            icon={Package}
            label="Inventory"
          />
        </nav>

        <div className="p-4 border-t text-xs text-muted-foreground text-center">
          v1.0.0
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-auto h-screen">
        <div className="max-w-5xl mx-auto">
          {renderContent()}
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default App;