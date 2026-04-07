export default function TourDetailLoading() {
  return (
    <div className="ds-page" style={{ paddingTop: '80px' }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero image skeleton */}
        <div className="ds-skeleton rounded-xl h-64 lg:h-96 w-full mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="ds-skeleton h-8 w-3/4 rounded" />
            <div className="ds-skeleton h-4 w-1/3 rounded" />
            <div className="space-y-2 mt-4">
              <div className="ds-skeleton h-4 w-full rounded" />
              <div className="ds-skeleton h-4 w-full rounded" />
              <div className="ds-skeleton h-4 w-2/3 rounded" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="ds-skeleton h-48 rounded-xl" />
            <div className="ds-skeleton h-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
