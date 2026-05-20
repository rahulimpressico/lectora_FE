import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { CourseGenerationPage } from "@/features/course-generation";
import { DashboardPage } from "@/pages/DashboardPage";
import { AssetLibraryPage } from "@/pages/AssetLibraryPage";
import { DocumentsLibraryPage } from "@/pages/DocumentsLibraryPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "generate", element: <CourseGenerationPage /> },
      { path: "assert_library", element: <AssetLibraryPage /> },
      { path: "documents_library", element: <DocumentsLibraryPage /> },
    ],
  },
]);
