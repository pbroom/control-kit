import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

type DocsOutlineItem = {
  depth: 2 | 3;
  id: string;
  label: string;
};

const HEADING_SELECTOR = 'h2, h3';

function slugifyHeading(label: string) {
  return (
    label
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-') || 'section'
  );
}

function collectOutlineItems(article: HTMLElement) {
  const usedIds = new Set<string>();

  return Array.from(
    article.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR),
  ).flatMap<DocsOutlineItem>((heading) => {
    if (heading.closest('[data-docs-example]')) return [];

    const label = heading.textContent?.trim();
    if (!label) return [];

    const baseId = heading.id || slugifyHeading(label);
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    heading.id = id;
    heading.dataset.docsOutlineTarget = '';
    usedIds.add(id);

    return [
      {
        depth: heading.tagName === 'H3' ? 3 : 2,
        id,
        label,
      },
    ];
  });
}

export function DocsOnThisPage({
  articleRef,
  pageKey,
}: {
  articleRef: RefObject<HTMLElement | null>;
  pageKey: string;
}) {
  const [items, setItems] = useState<readonly DocsOutlineItem[]>([]);
  const [activeId, setActiveId] = useState('');

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const nextItems = collectOutlineItems(article);
    setItems(nextItems);
    setActiveId(nextItems[0]?.id ?? '');
  }, [articleRef, pageKey]);

  useEffect(() => {
    const article = articleRef.current;
    if (!article || items.length === 0) return;

    const scrollRoot = article.closest<HTMLElement>('[data-docs-page-scroll]');
    if (!scrollRoot) return;

    const headings = Array.from(
      article.querySelectorAll<HTMLHeadingElement>(
        '[data-docs-outline-target]',
      ),
    );
    let animationFrame = 0;

    const updateActiveHeading = () => {
      const threshold = scrollRoot.getBoundingClientRect().top + 96;
      let nextActiveId = headings[0]?.id ?? '';

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > threshold) break;
        nextActiveId = heading.id;
      }

      if (
        scrollRoot.scrollHeight -
          scrollRoot.scrollTop -
          scrollRoot.clientHeight <
        2
      ) {
        nextActiveId = headings.at(-1)?.id ?? nextActiveId;
      }

      setActiveId((currentId) =>
        currentId === nextActiveId ? currentId : nextActiveId,
      );
    };
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveHeading);
    };

    scheduleUpdate();
    scrollRoot.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      scrollRoot.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [articleRef, items]);

  if (items.length === 0) return null;

  return (
    <aside className="docs-on-this-page" data-docs-on-this-page>
      <p className="docs-on-this-page-title" id="docs-on-this-page-title">
        On this page
      </p>
      <nav
        aria-labelledby="docs-on-this-page-title"
        className="docs-on-this-page-nav flex flex-col"
      >
        {items.map((item) => (
          <a
            aria-current={activeId === item.id ? 'location' : undefined}
            className={`ck-lab-page-link docs-on-this-page-link flex w-full items-center rounded-lg px-1 py-1 text-left text-sm leading-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#5288db]${item.depth === 3 ? ' nested' : ''}`}
            data-active={activeId === item.id ? 'true' : 'false'}
            data-depth={item.depth}
            href={`#${item.id}`}
            key={item.id}
            onClick={() => setActiveId(item.id)}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
