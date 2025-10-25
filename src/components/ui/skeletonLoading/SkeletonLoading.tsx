// components/skeleton/SkeletonBlock.tsx
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

interface SkeletonBlockProps {
  lines?: number;
  showButton?: boolean;
  titleWidth?: number | string;
  contentWidth?: number | string;
}

const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  lines = 2,
  showButton = false,
  titleWidth = "50%",
  contentWidth = "30%",
}) => {
  return (
    <div className="p-4 rounded-xl shadow-md bg-[var(--tertiary-background)]">
      <Skeleton height={16} width={titleWidth} className="mb-2" />
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} height={14} width={contentWidth} className="mb-2" />
      ))}
      {showButton && <Skeleton height={30} width={100} />}
    </div>
  );
};

export default SkeletonBlock;
