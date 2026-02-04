import { Route, Routes } from "react-router-dom";
import { AppSidebar } from "./components/ui/app-sidebar";
import { SidebarProvider } from "./components/ui/sidebar";
import ConvertVideoPage from "./pages/convert-video";
import CompressVideoPage from "./pages/compress-video";
import ImageProcessingPage from "./pages/image-processing";

function App() {
  return (
    <SidebarProvider>
      <div className="flex w-full">
        <AppSidebar className="w-48" />
        <div className="w-full ml-48">
          <Routes>
            <Route path="/" element={<ConvertVideoPage />} />
            <Route path="/compress-video" element={<CompressVideoPage />} />
            <Route path="/image-processing" element={<ImageProcessingPage />} />
          </Routes>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default App;
