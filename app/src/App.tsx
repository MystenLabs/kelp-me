import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { LayoutDashboard, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Toaster } from "sonner";
import { ChallengeForm } from "./components/ChallengeForm";
import { CreateKelp } from "./components/CreateKelp";
import { Dashboard } from "./components/Dashboard";
import { RecoveryFlow } from "./components/RecoveryFlow";

type Tab = "dashboard" | "setup" | "recovery" | "challenge";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  { id: "setup", label: "Setup", icon: <Plus className="w-4 h-4" /> },
  {
    id: "recovery",
    label: "Recovery",
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    id: "challenge",
    label: "Challenge",
    icon: <ShieldAlert className="w-4 h-4" />,
  },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedKelpId, setSelectedKelpId] = useState<string>();
  const account = useCurrentAccount();

  const navigateTo = (tab: string) => {
    setActiveTab(tab as Tab);
  };

  return (
    <div className="min-h-screen">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-bold tracking-tight">KELP</h1>
          <ConnectButton />
        </div>
      </header>

      {/* Tab Navigation */}
      {account && (
        <nav className="border-b bg-background/50">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && (
          <Dashboard onSelectKelp={setSelectedKelpId} onNavigate={navigateTo} />
        )}
        {activeTab === "setup" && account && (
          <CreateKelp
            onCreated={(id) => {
              setSelectedKelpId(id);
              setActiveTab("dashboard");
            }}
          />
        )}
        {activeTab === "recovery" && account && (
          <RecoveryFlow initialKelpId={selectedKelpId} />
        )}
        {activeTab === "challenge" && account && (
          <ChallengeForm initialKelpId={selectedKelpId} />
        )}
      </main>
    </div>
  );
}

export default App;
