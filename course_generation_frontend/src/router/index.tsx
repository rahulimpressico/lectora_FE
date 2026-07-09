import { createBrowserRouter, Outlet } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { RequireAuth } from "@/auth/RequireAuth";
import { HomePage } from "@/modules/home";
import { DashboardPage } from "@/modules/dashboard";
import { CourseGenerationPage } from "@/modules/course-generation";
import { AssetLibraryPage } from "@/modules/assert-library";
import { DocumentsLibraryPage } from "@/modules/documents";
import { CostingDashboardPage } from "@/modules/costing";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    element: (
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    ),
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard",          element: <DashboardPage /> },
          { path: "/generate",           element: <CourseGenerationPage /> },
          { path: "/assert_library",     element: <AssetLibraryPage /> },
          { path: "/documents_library",  element: <DocumentsLibraryPage /> },
          { path: "/costing",            element: <CostingDashboardPage /> },
        ],
      },
    ],
  },
]);
