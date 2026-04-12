import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AppProvider } from "./context/AppContext";
import { Toaster } from "sonner";
import { MAINTENANCE_MODE } from './lib/maintenance';
import { MaintenancePage } from './components/MaintenancePage';

export default function App() {
  if (MAINTENANCE_MODE) return <MaintenancePage />;
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </AppProvider>
  );
}
