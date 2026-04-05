import { CommunityMaterials } from "@/components/community-materials";
import { CommunityProfiles } from "@/components/community-profiles";

export default function CommunityPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Community Hub</h1>
          <p className="text-muted-foreground">Co-living & co-working engagement and post-sale CRM</p>
        </div>
      </div>
      <CommunityMaterials />
      <CommunityProfiles />
    </div>
  );
}
