export default function RouteDetailLoading() {
  return (
    <div className="ds-page" style={{ paddingTop: '80px' }}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="ds-skeleton h-10 w-2/3 rounded" />
        <div className="ds-skeleton h-5 w-1/2 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="ds-skeleton h-64 rounded-xl" />
            <div className="ds-skeleton h-4 w-full rounded" />
            <div className="ds-skeleton h-4 w-3/4 rounded" />
          </div>
          <div className="space-y-4">
            <div className="ds-skeleton h-40 rounded-xl" />
            <div className="ds-skeleton h-24 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
