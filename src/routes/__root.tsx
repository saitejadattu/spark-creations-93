import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/AppSidebar";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found.</p>
        <Link to="/dashboard" className="mt-6 inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium">Go to dashboard</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CreativeAI — AI Marketing Creatives for D2C" },
      { name: "description", content: "Generate, review, and export AI-powered marketing creatives for your D2C brand." },
      { property: "og:title", content: "CreativeAI — AI Marketing Creatives for D2C" },
      { name: "twitter:title", content: "CreativeAI — AI Marketing Creatives for D2C" },
      { property: "og:description", content: "Generate, review, and export AI-powered marketing creatives for your D2C brand." },
      { name: "twitter:description", content: "Generate, review, and export AI-powered marketing creatives for your D2C brand." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/eff73b1f-4dd2-4bee-9dcd-2320b7cc364e/id-preview-dd9600e9--2edaa386-1a5a-4e40-b804-198dd556b6c6.lovable.app-1778323188863.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/eff73b1f-4dd2-4bee-9dcd-2320b7cc364e/id-preview-dd9600e9--2edaa386-1a5a-4e40-b804-198dd556b6c6.lovable.app-1778323188863.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
