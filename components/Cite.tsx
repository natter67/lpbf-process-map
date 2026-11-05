import { SOURCES, type SourceKey } from "@/lib/sources";

export const SOURCE_KEYS = Object.keys(SOURCES) as SourceKey[];
export const sourceNumber = (k: SourceKey) => SOURCE_KEYS.indexOf(k) + 1;

/** Inline numbered citation that jumps to the reference list. */
export function Cite({ k }: { k: SourceKey | SourceKey[] }) {
  const keys = Array.isArray(k) ? k : [k];
  return (
    <>
      {keys.map((key) => (
        <a key={key} className="cite" href={`#ref-${key}`} title={SOURCES[key].citation}>
          [{sourceNumber(key)}]
        </a>
      ))}
    </>
  );
}
