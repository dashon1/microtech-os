
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Image, 
  Megaphone, 
  Package, 
  Video, 
  MapPin,
  FolderOpen,
  Palette,
  LogOut,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const appLinks = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Illustration Generator",
    url: createPageUrl("IllustrationGenerator"),
    icon: Image,
  },
  {
    title: "Ad Multi-Editor",
    url: createPageUrl("AdEditor"),
    icon: Megaphone,
  },
  {
    title: "MockupMaster",
    url: createPageUrl("MockupMaster"),
    icon: Package,
  },
  {
    title: "Video Storyboard",
    url: createPageUrl("VideoStoryboard"),
    icon: Video,
  },
  {
    title: "Billboard Placements",
    url: createPageUrl("BillboardPlacements"),
    icon: MapPin,
  },
];

const utilityLinks = [
  {
    title: "Gallery",
    url: createPageUrl("Gallery"),
    icon: FolderOpen,
  },
  {
    title: "Brand Kits",
    url: createPageUrl("BrandKits"),
    icon: Palette,
  },
  {
    title: "AI Tools",
    url: createPageUrl("AITools"),
    icon: Sparkles,
  },
  ];

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
    
    // Load theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full transition-colors duration-300 ${isDark ? 'dark bg-slate-950' : 'bg-gray-50'}`}>
        <Sidebar className="border-r dark:border-slate-800 border-slate-200 dark:bg-slate-950/50 bg-white/50 backdrop-blur-xl">
          <SidebarHeader className="border-b dark:border-slate-800 border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/50">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg dark:text-white text-slate-900">AI Microtech OS</h2>
                <p className="text-xs dark:text-slate-400 text-slate-500">Content Creation Suite</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider px-3 mb-2">
                AI Apps
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {appLinks.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`mb-1 transition-all duration-200 rounded-lg ${
                          location.pathname === item.url 
                            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10' 
                            : 'dark:text-slate-300 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider px-3 mb-2">
                Library
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {utilityLinks.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`mb-1 transition-all duration-200 rounded-lg ${
                          location.pathname === item.url 
                            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10' 
                            : 'dark:text-slate-300 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t dark:border-slate-800 border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-xs font-medium dark:text-slate-400 text-slate-500">Theme</span>
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 rounded-full">
                {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
              </Button>
            </div>
            {user && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg dark:bg-slate-900/50 bg-slate-100">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm dark:text-white text-slate-900 truncate">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-xs dark:text-slate-400 text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 dark:text-slate-400 text-slate-500" />
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-white">
          <div className="min-h-screen">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
