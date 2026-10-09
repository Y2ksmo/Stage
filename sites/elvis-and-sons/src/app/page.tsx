import { quoteLabel } from "./content";
import { Hero, Metrics } from "./hero";
import { Intro } from "./intro";
import { QuoteSection } from "./quote-form";
import { Reviews } from "./reviews";
import { Portfolio, Services } from "./services";
import { Trust } from "./trust";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ElvisHomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const query = await searchParams;
  const category = quoteLabel(one(query.category));

  return (
    <main>
      <Intro />
      <Hero />
      <Metrics />
      <Services />
      <Trust />
      <Portfolio />
      <Reviews />
      <QuoteSection initialCategory={category} />
    </main>
  );
}
