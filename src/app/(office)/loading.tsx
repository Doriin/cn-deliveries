import { Skeleton } from "@/components/ui";

/** Shown at once while a page's data loads, shaped like the page so nothing jumps when it arrives. */
export default function OfficeLoading() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-2 h-8 w-56" />
      <Skeleton className="mb-7 h-4 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 !rounded-2xl" />)}
      </div>
      <Skeleton className="mt-6 h-72 !rounded-2xl" />
    </div>
  );
}
