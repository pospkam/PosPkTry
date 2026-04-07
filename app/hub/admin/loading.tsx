export default function AdminLoading() {
  return (
    <div className="ds-page pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="ds-skeleton h-8 w-56 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ds-card p-4 space-y-2">
              <div className="ds-skeleton h-4 w-24 rounded" />
              <div className="ds-skeleton h-8 w-20 rounded" />
            </div>
          ))}
        </div>
        <div className="ds-skeleton h-80 rounded-xl" />
      </div>
    </div>
  );
}
