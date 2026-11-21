import { Skeleton } from "@/components/ui";

export default function CourierLoading() {
  return (
    <div className="cr-page" aria-busy="true">
      <div className="cr-top">
        <div className="cr-top-row"><Skeleton className="h-6 w-28" /></div>
      </div>
      <div className="cr-block">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-8 w-3/4" />
        <Skeleton className="mt-2 h-5 w-1/2" />
        <Skeleton className="mt-5 h-12" />
      </div>
      <div className="cr-pad">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="mt-3 h-12" />)}
      </div>
    </div>
  );
}
