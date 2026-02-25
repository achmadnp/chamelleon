import { Link, useLocation } from "react-router-dom";
import { Separator } from "./separator";
import appIcon from "@/assets/appicon.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "./sidebar";
import {
  ArrowRightLeft,
  Minimize2,
  Palette,
  ImageIcon,
  Video,
  Scissors,
  Music,
} from "lucide-react";

const APP_VERSION = "v1.0.1b";

const NAV_ITEMS = [
  {
    group: "Video",
    groupIcon: Video,
    items: [
      { label: "Convert", path: "/", icon: ArrowRightLeft },
      { label: "Compress", path: "/compress-video", icon: Minimize2 },
      { label: "Trim / GIF", path: "/trim-video", icon: Scissors },
    ],
  },
  {
    group: "Audio",
    groupIcon: Music,
    items: [{ label: "Extract / Mute", path: "/audio-tools", icon: Music }],
  },
  {
    group: "Image",
    groupIcon: ImageIcon,
    items: [
      { label: "Convert", path: "/convert-image", icon: ArrowRightLeft },
      { label: "Processing", path: "/image-processing", icon: Palette },
      { label: "Compress", path: "/compress-image", icon: Minimize2 },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="px-1 py-2">
          <div className="flex items-center gap-2">
            <img
              src={appIcon}
              alt="Chamelleon"
              className="w-8 h-8 rounded-lg object-contain"
            />
            <div>
              <div className="text-base font-bold tracking-tight gradient-text">
                Chamelleon
              </div>
              <div className="text-[10px] font-medium text-sidebar-foreground/50 tracking-wider uppercase">
                Media Shapeshifter
              </div>
            </div>
          </div>
        </div>
        <Separator className="h-px bg-sidebar-border/50" orientation="horizontal" />
      </SidebarHeader>

      <SidebarContent className="px-2 mt-2">
        {NAV_ITEMS.map((group) => (
          <SidebarGroup key={group.group} className="mb-1">
            <SidebarGroupLabel className="px-3 mb-1 text-[11px] font-semibold tracking-wider uppercase text-sidebar-foreground/40">
              {group.group}
            </SidebarGroupLabel>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path} className="block">
                    <div
                      className={`
                        group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                        transition-all duration-200 cursor-pointer relative
                        ${
                          isActive
                            ? "bg-primary/15 text-primary shadow-sm"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }
                      `}
                    >
                      {isActive && (
                        <div className="absolute left-0 w-[3px] h-5 rounded-r-full bg-primary" />
                      )}
                      <Icon
                        className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? "text-primary" : "text-sidebar-foreground/50"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 border-t border-sidebar-border/30">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-sidebar-foreground/30 font-mono">
            {APP_VERSION}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
