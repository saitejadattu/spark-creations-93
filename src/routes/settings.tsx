import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — CreativeAI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="bg-card rounded-lg p-6 shadow-sm">
        <h2 className="font-semibold mb-1">API Configuration</h2>
        <label className="block text-sm font-medium mt-3 mb-1">Gemini API Key</label>
        <input type="password" value="••••••••••••••••" readOnly className="w-full px-3 py-2 rounded-md border border-input bg-muted/30" />
        <p className="text-xs text-muted-foreground mt-2">
          This key is used server-side only via the backend function. Never exposed to the browser.
          Configured in Lovable Cloud secrets as <code>GEMINI_API_KEY</code>.
        </p>
      </section>

      <section className="bg-card rounded-lg p-6 shadow-sm">
        <h2 className="font-semibold mb-3">Export Preferences</h2>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" defaultChecked /> Default format: PNG
        </label>
      </section>

      <section className="bg-card rounded-lg p-6 shadow-sm">
        <h2 className="font-semibold mb-1">About</h2>
        <p className="text-sm text-muted-foreground">CreativeAI — Built with Lovable + Lovable Cloud + Gemini API</p>
        <p className="text-xs text-muted-foreground mt-1">Version 1.0.0 MVP</p>
      </section>
    </div>
  );
}
