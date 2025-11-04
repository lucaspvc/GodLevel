import { useState } from "react";
import { BarChart3, ShoppingCart, Package, Store } from "lucide-react";
import DashboardTab from "@/components/DashboardTab";
import VendasTab from "@/components/VendasTab";
import ProdutosTab from "@/components/ProdutosTab";
import UnidadesTab from "@/components/UnidadesTab";

type TabType = "dashboard" | "vendas" | "produtos" | "unidades";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const tabs = [
    { id: "dashboard" as TabType, label: "Dashboard", icon: BarChart3 },
    { id: "vendas" as TabType, label: "Vendas", icon: ShoppingCart },
    { id: "produtos" as TabType, label: "Produtos", icon: Package },
    { id: "unidades" as TabType, label: "Unidades", icon: Store },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />;
      case "vendas":
        return <VendasTab />;
      case "produtos":
        return <ProdutosTab />;
      case "unidades":
        return <UnidadesTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar fixa */}
      <nav className="sticky top-0 z-50 bg-card shadow-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-foreground">Dashboard Restaurantes</h1>
            
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                      ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo das abas */}
      <main className="py-6">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default Index;
