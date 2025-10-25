// components/skeleton/UserProfileSkeleton.tsx
import SkeletonBlock from "@/components/ui/skeletonLoading/SkeletonLoading";
import Skeleton from "react-loading-skeleton";

const UserProfileSkeleton = () => {
  return (
    <div className="w-full flex-1 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <Skeleton height={40} width={200} />
          <Skeleton height={36} width={100} />
        </div>

        <div className="p-4 mb-3">
          <Skeleton height={16} width={80} className="mb-1" />
          <Skeleton height={14} width={150} className="mb-3" />
          <Skeleton height={16} width={80} className="mb-1" />
          <Skeleton height={14} width={150} />
        </div>

        {[1, 2, 3, 4].map((_, idx) => (
          <section className="mb-12" key={idx}>
            <Skeleton height={24} width={200} className="mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} showButton />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default UserProfileSkeleton;
