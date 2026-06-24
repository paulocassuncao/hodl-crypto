import { AlertsList } from "@/components/alerts/alerts-list";

export const metadata = {
  title: "Alerts · HODL",
  description: "Your crypto price alerts.",
};

export default function AlertsPage(): React.ReactNode {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Price Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Browser notifications when a coin crosses your target. Alerts fire
          only while a HODL tab is open.
        </p>
      </div>
      <AlertsList />
    </section>
  );
}
