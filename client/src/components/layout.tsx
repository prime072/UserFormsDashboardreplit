import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  Plus,
  Menu,
  BarChart3,
  User,
  Users,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/forms", label: "My Forms", icon: FileText },
    { href: "/responses", label: "Responses", icon: BarChart3 },
    { href: "/databases", label: "Databases", icon: Database },
    { href: "/private-users", label: "Private Users", icon: Users },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">F</div>
            <span className="text-xl font-display font-bold text-slate-900 dark:text-white">FormFlow</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary dark:bg-primary/20" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                }`}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-3 mb-4 px-2">
            <Avatar className="h-8 w-8">
              {user?.photo ? (
                <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {(user?.firstName?.charAt(0) || "U") + (user?.lastName?.charAt(0) || "")}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start text-slate-600 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">F</div>
            <span className="text-lg font-display font-bold text-slate-900 dark:text-white">FormFlow</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="dark:text-slate-400 dark:hover:text-white">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 dark:bg-slate-900 dark:border-slate-800">
              {/* Mobile Nav Content */}
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xl font-display font-bold text-slate-900 dark:text-white">FormFlow</span>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </div>
                    </Link>
                  ))}
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <Button variant="ghost" className="w-full justify-start dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
