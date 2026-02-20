import { Route, Routes } from "react-router-dom";
import { AppSidebar } from "./components/ui/app-sidebar";
import { SidebarProvider } from "./components/ui/sidebar";
import ConvertVideoPage from "./pages/convert-video";
import CompressVideoPage from "./pages/compress-video";
import TrimVideoPage from "./pages/trim-video";
import ImageProcessingPage from "./pages/image-processing";
import ConvertImagePage from "./pages/convert-image";
import CompressImagePage from "./pages/compress-image";

function App() {
  return (
    <SidebarProvider>
      <div className="flex w-full">
        <AppSidebar className="w-48" />
        <div className="w-full ml-48">
          <Routes>
            <Route path="/" element={<ConvertVideoPage />} />
            <Route path="/compress-video" element={<CompressVideoPage />} />
            <Route path="/trim-video" element={<TrimVideoPage />} />
            <Route path="/image-processing" element={<ImageProcessingPage />} />
            <Route path="/convert-image" element={<ConvertImagePage />} />
            <Route path="/compress-image" element={<CompressImagePage />} />
          </Routes>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default App;
