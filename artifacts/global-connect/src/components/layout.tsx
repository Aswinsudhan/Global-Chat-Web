import { Link, useLocation } from "wouter";
import { MessageSquare, LayoutGrid, Settings as SettingsIcon } from "lucide-react";
import { useUsername } from "@/hooks/use-username";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { username } = useUsername();

  const navItems = [
    { href: "/", label: "Global Chat", icon: MessageSquare },
    { href: "/rooms", label: "Private Rooms", icon: LayoutGrid },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      <aside className="w-64 flex-shrink-0 border-r bg-sidebar flex flex-col">
        <div className="p-4 border-b h-14 flex items-center">
          <h1 className="font-bold text-lg text-sidebar-foreground tracking-tight flex items-center gap-2">
            <img src="/favicon.svg" alt="Global Connect Logo" className="w-6 h-6" />
            Global Connect
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        {username && (
          <div className="p-4 border-t border-sidebar-border mt-auto">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 rounded-md bg-sidebar-primary/10 border border-sidebar-primary/20 text-sidebar-primary">
                <AvatarFallback className="rounded-md bg-transparent">{username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate text-sidebar-foreground">{username}</span>
                <span className="text-xs text-sidebar-foreground/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Online
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
