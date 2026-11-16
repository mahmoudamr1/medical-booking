'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';

/** Scroll state + direction-aware paging for a horizontal track. */
function useCarousel(itemCount: number) {
  const { dir } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // In RTL, scrollLeft is 0 at the start and negative towards the end.
    const pos = Math.abs(el.scrollLeft);
    setCanPrev(pos > 4);
    setCanNext(pos + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, itemCount]);

  const page = (forward: boolean) => {
    const el = ref.current;
    if (!el) return;
    const distance = el.clientWidth * 0.9 * (forward ? 1 : -1) * (dir === 'rtl' ? -1 : 1);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: distance, behavior: reduce ? 'auto' : 'smooth' });
  };

  return { ref, update, canPrev, canNext, page };
}

/**
 * Horizontal snap carousel (swipe on touch). Item widths: ~85% on phones, 2 per row on tablets,
 * 4 on desktop; equal heights. The track is padded with matching negative margins so the first and
 * last cards keep their borders/shadows. Previous/next buttons are handed to `header` so they sit in
 * the section title row; they are hidden on narrow and touch-only screens (swipe instead).
 */
export function Carousel({
  label,
  header,
  children,
}: {
  label: string;
  header: (controls: ReactNode) => ReactNode;
  children: ReactNode[];
}) {
  const { t } = useI18n();
  const { ref, update, canPrev, canNext, page } = useCarousel(children.length);

  const controls = (
    <div className="hidden items-center gap-2 md:flex pointer-coarse:hidden">
      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={() => page(false)}
        disabled={!canPrev}
        aria-label={t('common.previous')}
      >
        <ChevronRight className="ltr:rotate-180" aria-hidden />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={() => page(true)}
        disabled={!canNext}
        aria-label={t('common.next')}
      >
        <ChevronLeft className="ltr:rotate-180" aria-hidden />
      </Button>
    </div>
  );

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="space-y-6">
      {header(controls)}
      <div
        ref={ref}
        onScroll={update}
        tabIndex={0}
        className="-mx-4 -my-3 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 py-3 outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-ring/50 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-3 lg:scroll-px-3 lg:px-3 [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            className="flex shrink-0 basis-[85%] snap-start sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-3rem)/4)] [&>*]:w-full [&>*]:min-w-0"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
