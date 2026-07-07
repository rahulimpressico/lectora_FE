import { createBrowserRouter, Outlet } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { RequireAuth } from "@/auth/RequireAuth";
import { HomePage } from "@/modules/home";
import { DashboardPage } from "@/modules/dashboard";
import { CourseGenerationPage } from "@/modules/course-generation";
import { AssetLibraryPage } from "@/modules/assert-library";
import { DocumentsLibraryPage } from "@/modules/documents";
import { CostingDashboardPage } from "@/modules/costing";
import { LoginPage } from "@/modules/auth/pages/LoginPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: (
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    ),
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
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
