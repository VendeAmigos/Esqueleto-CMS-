export default function AdminLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-gray-200 pb-5 mb-8 flex justify-between items-end">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-gray-200 rounded-xl" />
          <div className="h-4 w-96 bg-gray-200 rounded-lg" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-xl" />
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-gray-200 rounded-md" />
              <div className="h-5 w-5 bg-gray-200 rounded-md" />
            </div>
            <div className="h-9 w-16 bg-gray-300 rounded-lg" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Content Table Skeleton */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded-md" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-14 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
