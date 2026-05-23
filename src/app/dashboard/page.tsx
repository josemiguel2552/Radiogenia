import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { ConsentWall } from "@/components/consent-wall";

export default function DashboardPage() {
  return (
    <ConsentWall>
      <DashboardContent />
    </ConsentWall>
  );
}
