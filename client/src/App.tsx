import React, { useState } from "react";
import { EmailGenerator } from "./components/dashboard/EmailGenerator";
import { ReservationTracker } from "./components/dashboard/ReservationTracker";
import { InventoryTracker } from "./components/dashboard/InventoryTracker";
import { MeetingNotes } from "./components/dashboard/MeetingNotes";
import { Mail, CalendarCheck, Package, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import ilcLogo from "./ilc-logo.png";

type View = "email-gen" | "reservations" | "inventory" | "notes";

const navItems = [
  { view: "reservations" as View, icon: CalendarCheck, label: "Event Tracker" },
  { view: "email-gen" as View, icon: Mail, label: "Email Generator" },
  { view: "notes" as View, icon: FileText, label: "Meeting Notes & Agendas" },
  { view: "inventory" as View, icon: Package, label: "Inventory" },
];

function App() {
  const [activeView, setActiveView] = useState<View>("reservations");
  const [emailGeneratorTab, setEmailGeneratorTab] = useState<"presentations" | "catering">("presentations");
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className="border-r bg-muted/20 flex flex-col shrink-0 sticky top-0 h-screen transition-all duration-200 overflow-hidden"
        style={{ width: collapsed ? "68px" : "256px" }}
      >
        {/* Logo + title */}
        <div className="p-3 flex flex-col items-center gap-2">
          <img src={ilcLogo} alt="ILC Logo" className="w-12 h-12 object-contain shrink-0" />
          {!collapsed && (
            <p className="font-bold text-xl text-primary leading-tight text-center">Outreach Dashboard</p>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 px-4 space-y-2 mt-1 ${collapsed ? "flex flex-col justify-center" : ""}`} style={collapsed ? { paddingBottom: "400%" } : {}}>
          {navItems.map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              title={label}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${collapsed ? "justify-center" : "gap-3 space-x-3"}
                ${activeView === view
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full mb-3 flex items-center justify-center gap-2 py-4 px-3 border-t bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-sm font-medium"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
        </button>


      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-6 px-6 pb-4 overflow-auto h-screen">
        {renderContent()}
      </main>
      <Toaster />
    </div>
  );
}

export default App;