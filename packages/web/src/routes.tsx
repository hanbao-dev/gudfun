import { createBrowserRouter } from "react-router"

import App from "./App"
import { ShowView } from "./components/show-view"
import {
  AdminSettingsPage,
  AdminSettingsErrorBoundary,
} from "./pages/AdminSettingsPage"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      { index: true, Component: ShowView },
      {
        path: "admin/settings",
        Component: AdminSettingsPage,
        ErrorBoundary: AdminSettingsErrorBoundary,
      },
    ],
  },
])
