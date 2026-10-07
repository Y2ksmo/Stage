import Image from "next/image";
import { BrandLink } from "./brand-link";
import { container, jobs, services } from "./content";
import { IconArrow, IconBrush, IconBuilding, IconCar, IconHome, IconTruck } from "./icons";

const icons = [IconTruck, IconHome, IconBuilding, IconBrush, IconCar];

export function Services() {
  return (
    <section id="services" className="scroll-mt-28 bg-white py-20 sm:py-24" aria-labelledby="services-heading">
      <div className={container}>
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">Services we offer</p>
          <h2 id="services-heading" className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0F172A] sm:text-4xl">
            Moving, cleanouts, cleaning, and painting across the DMV
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#334155]">
            Fast service. Licensed and insured. Serving Maryland, Virginia, and Washington, D.C.
          </p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((item, index) => {
            const Icon = icons[index] ?? IconTruck;
            return (
              <li key={item.id} className={index === 4 ? "sm:col-span-2 xl:col-span-1" : undefined}>
                <article id={item.id} className="group flex h-full scroll-mt-28 flex-col rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 transition duration-200 hover:-translate-y-1 hover:border-[#2563EB]/35 hover:bg-white hover:shadow-[0_20px_40px_-28px_rgba(15,23,42,0.55)]">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFFBEB] text-[#B45309]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">{item.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[#334155]">{item.body}</p>
                  <BrandLink
                    href={`/?category=${item.quote}#quote`}
                    category={item.quote}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563EB]"
                  >
                    Request this service
                    <IconArrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </BrandLink>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function Portfolio() {
  return (
    <section id="portfolio" className="scroll-mt-28 border-y border-slate-200 bg-[#F8FAFC] py-16 sm:py-20" aria-labelledby="portfolio-heading">
      <div className={container}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">Recent work</p>
        <h2 id="portfolio-heading" className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[#0F172A] sm:text-4xl">
          Hauls and cleanouts from the truck
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#334155]">
          Debris, household loads, fixtures, and the trucks that carry them.
        </p>
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {jobs.map((job) => (
            <li key={job.src} className={`group relative overflow-hidden rounded-2xl bg-[#0F172A] shadow-[0_18px_40px_-28px_rgba(15,23,42,0.65)] ${job.span}`}>
              <Image
                src={job.src}
                alt={job.alt}
                fill
                sizes={job.span.includes("row-span-2") ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F172A]/92 via-[#0F172A]/40 to-transparent px-4 pb-4 pt-16">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FBBF24]">{job.kicker}</p>
                <h3 className="mt-1 text-base font-semibold text-white">{job.title}</h3>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-[#475569]">
          Text or call <a className="font-semibold text-[#1D4ED8] hover:underline" href="tel:+14433809960">(443) 380-9960</a> for immediate assistance.
        </p>
      </div>
    </section>
  );
}
