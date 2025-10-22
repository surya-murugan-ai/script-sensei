import { FileText, History, Settings, Download, Stethoscope, ScanEye } from "lucide-react";
import { Link, useLocation } from "wouter";

const navigationItems = [
  { href: "/", icon: FileText, label: "Extract Prescriptions", active: true },
  { href: "/review", icon: ScanEye, label: "Prescription Review" },
  { href: "/history", icon: History, label: "Processing History" },
  { href: "/config", icon: Settings, label: "Model Configuration" },
];

const modelStatus = [
  { name: "OpenAI GPT-5", status: "Active" },
  { name: "Claude 3.5 Sonnet", status: "Active" },
  { name: "Gemini Pro Vision", status: "Active" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col" data-testid="sidebar-main">
      {/* Header */}
      <div className="p-6 border-b border-border" data-testid="sidebar-header">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Stethoscope className="text-primary-foreground text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">MedExtract AI</h1>
            <p className="text-sm text-muted-foreground">Prescription Analysis System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2" data-testid="sidebar-navigation">
        {navigationItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon className="w-5 h-5" />
              <span className={isActive ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Model Status */}
      <div className="p-4 border-t border-border" data-testid="sidebar-model-status">
        <h3 className="text-sm font-medium text-foreground mb-3">AI Model Status</h3>
        <div className="space-y-2">
          {modelStatus.map((model) => (
            <div 
              key={model.name} 
              className="flex items-center justify-between text-sm"
              data-testid={`model-status-${model.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="text-muted-foreground">{model.name}</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 text-xs">{model.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
