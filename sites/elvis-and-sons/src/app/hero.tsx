import { BrandLink } from "./brand-link";
import { btnGhostOnDark, btnPrimary, contact, container, metrics } from "./content";
import { IconBadge, IconClock, IconPin, IconReceipt, IconTruck } from "./icons";

const metricIcons = [IconClock, IconBadge, IconReceipt, IconPin];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#0F172A] text-white">
      <div className="elvis-hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#2563EB]/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-[#D97706]/15 blur-3xl" aria-hidden="true" />

      <div className={`${container} relative grid items-center gap-12 pb-28 pt-32 lg:grid-cols-12 lg:pb-32 lg:pt-40`}>
        <div className="lg:col-span-7">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#FBBF24]">
            <span className="h-px w-8 bg-[#D97706]" aria-hidden="true" />
            Elvis & Sons Multilink Ventures
          </p>
          <h1 className="mt-5 max-w-3xl text-[2.05rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl lg:leading-[1.1]">
            Property Cleaning, Moving & Junk Removal, Parking & Unparking Services
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#E2E8F0]">
            Professional residential and commercial moves, estate cleanouts, deep cleaning, and interior painting across the DMV area.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <BrandLink href="/#quote" className={btnPrimary}>
              Request a Quote
            </BrandLink>
            <a href={contact.phoneHref} className={btnGhostOnDark}>
              Call {contact.phoneDisplay}
            </a>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-white/15 bg-white/5 p-3 shadow-[0_30px_80px_-36px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:p-4">
            <div className="flex items-center justify-between px-2 pb-3 pt-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">MD · VA · DC</p>
              <p className="inline-flex items-center gap-2 text-xs font-medium text-[#BBF7D0]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" aria-hidden="true" />
                Same-day service
              </p>
            </div>
            <article className="rounded-2xl bg-white p-5 text-[#0F172A] shadow-lg">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFFBEB] text-[#B45309]">
                  <IconTruck className="h-5 w-5" />
                </span>
                <h2 className="text-base font-semibold">Services we offer</h2>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-[#334155]">
                <li>Moving and hauling</li>
                <li>Debris and junk removal</li>
                <li>Deep cleaning</li>
                <li>Interior painting</li>
                <li>Parking and unparking</li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Metrics() {
  return (
    <section aria-label="Service standards" className={`${container} relative z-10 -mt-16`}>
      <ul className="grid gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-200 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.45)] sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => {
          const Icon = metricIcons[index] ?? IconBadge;
          return (
            <li key={item.title} className="flex gap-4 bg-white p-5 sm:p-6">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFFBEB] text-[#B45309]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-[#0F172A]">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#475569]">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
