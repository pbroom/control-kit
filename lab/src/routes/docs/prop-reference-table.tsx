import { HighlightedCode } from './highlighted-code.js';

export type PropReference = {
  defaultValue?: string;
  description: string;
  name: string;
  required?: boolean;
  shortType?: string;
  type: string;
};

type PropReferenceTableProps = {
  name: string;
  props: readonly PropReference[];
};

function TypeCode({ children }: { children: string }) {
  return <HighlightedCode code={children} />;
}

export function PropReferenceTable({ name, props }: PropReferenceTableProps) {
  return (
    <section
      aria-label={`${name} component props table`}
      className="not-prose my-6 overflow-hidden rounded-xl border border-white/10 text-sm text-white/65"
    >
      <div
        aria-hidden="true"
        className="grid min-h-10 grid-cols-[1fr_2.5rem] items-center border-b border-white/10 bg-white/[0.035] text-white/62 min-[32rem]:grid-cols-[12rem_1fr_2.5rem] min-[40rem]:grid-cols-[14rem_1fr_2.5rem] min-[48rem]:grid-cols-[5fr_7fr_4.5fr_2.5rem]"
      >
        <span className="px-3">Prop</span>
        <span className="hidden px-3 min-[32rem]:block">Type</span>
        <span className="hidden px-3 min-[48rem]:block">Default</span>
        <span />
      </div>

      {props.map((prop) => {
        const id = `${name.toLowerCase()}-${prop.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

        return (
          <details
            className="group border-b border-white/10 last:border-b-0"
            key={prop.name}
          >
            <summary
              className="grid min-h-10 cursor-default list-none grid-cols-[1fr_2.5rem] items-center bg-[#151516] transition-colors marker:content-none hover:bg-white/[0.035] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/80 min-[32rem]:grid-cols-[12rem_1fr_2.5rem] min-[40rem]:grid-cols-[14rem_1fr_2.5rem] min-[48rem]:grid-cols-[5fr_7fr_4.5fr_2.5rem] [&::-webkit-details-marker]:hidden"
              id={id}
            >
              <span className="min-w-0 overflow-x-auto px-3 py-2 font-mono leading-5 text-[#9cc6ff] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {prop.name}
                {prop.required ? (
                  <sup className="ml-0.5 text-[#ff8e93]">*</sup>
                ) : null}
              </span>
              <span className="hidden min-w-0 overflow-x-auto px-3 py-2 leading-5 whitespace-nowrap [scrollbar-width:none] min-[32rem]:block [&::-webkit-scrollbar]:hidden">
                <TypeCode>{prop.shortType ?? prop.type}</TypeCode>
              </span>
              <span className="hidden min-w-0 overflow-x-auto px-3 py-2 leading-5 whitespace-nowrap [scrollbar-width:none] min-[48rem]:block [&::-webkit-scrollbar]:hidden">
                <TypeCode>{prop.defaultValue ?? '—'}</TypeCode>
              </span>
              <span className="flex size-10 items-center justify-center">
                <svg
                  aria-hidden="true"
                  className="size-3 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 10 10"
                >
                  <path d="M1 3.5 5 7.5 9 3.5" stroke="currentColor" />
                </svg>
              </span>
            </summary>

            <dl className="grid gap-y-3 border-t border-white/8 bg-white/[0.025] px-3 py-4 leading-5 min-[32rem]:grid-cols-[12rem_1fr_2.5rem] min-[40rem]:grid-cols-[14rem_1fr_2.5rem] min-[48rem]:grid-cols-[5fr_11.5fr_2.5rem]">
              <dt className="text-white/45">Name</dt>
              <dd className="min-w-0 min-[32rem]:col-span-2">
                <a
                  className="font-mono text-[#78b4ff]! no-underline! hover:underline!"
                  href={`#${id}`}
                >
                  {prop.name}
                </a>
              </dd>

              <dt className="border-t border-white/8 pt-3 text-white/45 min-[32rem]:border-t-0 min-[32rem]:pt-0">
                Description
              </dt>
              <dd className="min-w-0 text-white/68 min-[32rem]:col-span-2">
                {prop.description}
              </dd>

              <dt className="border-t border-white/8 pt-3 text-white/45 min-[32rem]:border-t-0 min-[32rem]:pt-0">
                Type
              </dt>
              <dd className="min-w-0 min-[32rem]:col-span-2">
                <div className="overflow-x-auto rounded-lg bg-black/18 px-3 py-2 leading-5 whitespace-pre [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TypeCode>{prop.type}</TypeCode>
                </div>
              </dd>

              {prop.defaultValue ? (
                <>
                  <dt className="border-t border-white/8 pt-3 text-white/45 min-[32rem]:border-t-0 min-[32rem]:pt-0">
                    Default
                  </dt>
                  <dd className="min-w-0 min-[32rem]:col-span-2">
                    <TypeCode>{prop.defaultValue}</TypeCode>
                  </dd>
                </>
              ) : null}
            </dl>
          </details>
        );
      })}
    </section>
  );
}
