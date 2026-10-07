import { container, reviews } from "./content";

export function Reviews() {
  return (
    <section id="reviews" className="scroll-mt-28 bg-white py-20 sm:py-24" aria-labelledby="reviews-heading">
      <div className={container}>
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">What our customers say</p>
          <h2 id="reviews-heading" className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0F172A] sm:text-4xl">
            Reliable service, careful work, and results you can feel good about
          </h2>
        </div>
        <ul className="mt-10 grid gap-5 lg:grid-cols-3">
          {reviews.map((review) => (
            <li key={review.place}>
              <figure className="flex h-full flex-col rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6">
                <p className="text-sm font-semibold tracking-[0.14em] text-[#B45309]" aria-label="5 out of 5 stars">★★★★★</p>
                <blockquote className="mt-4 flex-1 text-[#1E293B]">
                  <p className="font-semibold text-[#0F172A]">“{review.title}”</p>
                  <p className="mt-2 leading-relaxed">{review.quote}</p>
                </blockquote>
                <figcaption className="mt-5 text-sm font-medium text-[#475569]">{review.place}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[#475569]">
          Share your experience. Reviews are checked before approved testimonials are added to the page.
        </p>
      </div>
    </section>
  );
}
