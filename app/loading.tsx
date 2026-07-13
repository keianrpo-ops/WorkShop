export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="mt-6 h-80 animate-pulse rounded-lg bg-slate-200" />
    </div>
  );
}
