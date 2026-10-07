import { quoteLabel, type ServiceTab } from "./content";
import { Hero, Metrics } from "./hero";
import { QuoteSection } from "./quote-form";
import { Services } from "./services";
import { Trust } from "./trust";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ElvisHomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; category?: string | string[] }>;
}) {
  const query = await searchParams;
  const tab: ServiceTab = one(query.tab) === "moving" ? "moving" : "it";
  const category = quoteLabel(one(query.category));

  return (
    <main>
      <Hero />
      <Metrics />
      <Services initialTab={tab} />
      <Trust />
      <QuoteSection initialCategory={category} />
    </main>
  );
}
