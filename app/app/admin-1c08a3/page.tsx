import { getRequests } from "./data";
import { RequestCard } from "./request-card";
import { ApproveButton } from "./approve-button";
import { RejectButton } from "./reject-button";

export const metadata = { title: "Admin — Pending" };

export default async function AdminPendingPage() {
  const requests = await getRequests("pending");

  if (requests.length === 0) {
    return <p className="text-sm t-nav">No pending requests.</p>;
  }

  return (
    <div className="space-y-4">
      {requests.map((r) => (
        <RequestCard
          key={r.id}
          data={r}
          actions={
            <div className="flex items-center gap-2">
              <ApproveButton
                orgName={r.orgName}
                publisherId={r.actorId}
                publisherName={r.requesterName}
                claimType={r.claimType}
                targetOrgId={r.targetOrgId}
              />
              <RejectButton
                orgName={r.orgName}
                publisherId={r.actorId}
              />
            </div>
          }
        />
      ))}
    </div>
  );
}
