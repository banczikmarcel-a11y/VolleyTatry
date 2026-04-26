export default function GlobalLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-[8px] border border-court-line bg-white px-4 py-3 shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-court-line border-t-court-mint" />
        <span className="text-sm font-black text-court-ink">Načítavam...</span>
      </div>
    </div>
  );
}
