import { Button } from "./button";
import { Separator } from "./separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "./sidebar";
import { UserCog } from "lucide-react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="items-center justify-between">
          <div className="text-lg font-semibold">Chamelleon</div>
          <div className="text-xs">Media Shapeshifter</div>
        </div>

        <Separator className="h-1 my-1 rounded-xl" orientation="horizontal" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Video</SidebarGroupLabel>
          <a href="/" className="w-full">
            <Button variant="ghost" className="justify-start w-full">
              <UserCog className="w-4 h-4 mr-2" />
              <span className="text-base">Convert</span>
            </Button>
          </a>
          <a href="/compress-video" className="w-full">
            <Button variant="ghost" className="justify-start w-full">
              <UserCog className="w-4 h-4 mr-2" />
              <span className="text-base">Compress</span>
            </Button>
          </a>
        </SidebarGroup>

        <SidebarGroup className="space-y-2">
          <SidebarGroupLabel>Image</SidebarGroupLabel>
          <a href="/convert-image" className="w-full">
            <Button variant="ghost" className="justify-start w-full">
              <UserCog className="w-4 h-4 mr-2" />
              <span className="text-base">Convert</span>
            </Button>
          </a>
          <a href="/image-processing" className="w-full">
            <Button variant="ghost" className="justify-start w-full">
              <UserCog className="w-4 h-4 mr-2" />
              <span className="text-sm text-left">Image Processing</span>
            </Button>
          </a>
          <a href="/compress-image" className="w-full">
            <Button variant="ghost" className="justify-start w-full">
              <UserCog className="w-4 h-4 mr-2" />
              <span className="text-base">Compress</span>
            </Button>
          </a>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="text-xs gap-y-0">
        <span>Build: 4.153.224</span>
        <span>BuildID: as908u1x2mo1230j98</span>
      </SidebarFooter>
    </Sidebar>
  );
}
