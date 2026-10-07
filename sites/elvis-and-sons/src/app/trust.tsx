import { container, reasons } from "./content";
import { IconBadge, IconClock, IconReceipt, IconShield } from "./icons";

const icons = [IconClock, IconBadge, IconReceipt, IconShield];

export function Trust() {
  return (
    <section id="about" className="scroll-mt-28 bg-[#F8FAFC] py-20 sm:py-24" aria-labelledby="about-heading">
      <div className={container}>
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">Why Elvis & Sons</p>
          <h2 id="about-heading" className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0F172A] sm:text-4xl">
            Fast response, reliable crews, and careful work
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#334155]">
            Elvis & Sons Multilink Ventures handles moving, junk removal, deep cleaning, interior painting, and parking help across Maryland, Virginia, and Washington, D.C.
          </p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {reasons.map((reason, index) => {
            const Icon = icons[index] ?? IconShield;
            return (
              <li key={reason.title}>
                <article className="h-full rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#2563EB]/30 hover:shadow-[0_20px_40px_-28px_rgba(15,23,42,0.5)]">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1D4ED8]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-[#0F172A]">{reason.title}</h3>
                  <p className="mt-2 font-medium text-[#1E293B]">{reason.body}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#475569]">{reason.detail}</p>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
