import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/presentation/providers/auth-provider";
import { AppStateProvider } from "@/presentation/providers/app-state-provider";
import { DirectionProvider } from "@/presentation/providers/direction-provider";
import { NotificationProvider } from "@/presentation/providers/notification-provider";
import { ProductionDependencyProvider } from "@/presentation/providers/production-dependency-provider";
import { ServiceWorkerRegistrar } from "@/presentation/components/pwa/service-worker-registrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Block 6",
  description: "6區塊黃金比例時間分配法",
  appleWebApp: { title: "Block 6", statusBarStyle: "black" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" data-theme="dark" suppressHydrationWarning>
      <body>
        <ServiceWorkerRegistrar />
        <NotificationProvider>
          <AuthProvider>
            <ProductionDependencyProvider>
              <AppStateProvider>
                <DirectionProvider>{children}</DirectionProvider>
              </AppStateProvider>
            </ProductionDependencyProvider>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
