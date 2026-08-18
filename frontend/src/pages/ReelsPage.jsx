import { useParams, useLocation } from "react-router-dom";
import { ReelFeed } from "../components/reel/ReelFeed";

export function ReelsPage() {
  const { reelId } = useParams();
  const location = useLocation();
  const initialReels = location.state?.initialReels;
  const initialIndex = location.state?.initialIndex;
  return <ReelFeed detailId={reelId || ""} initialReels={initialReels} initialIndex={initialIndex} />;
}

