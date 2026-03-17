import { getRequests } from "../data";
import { RequestCard } from "../request-card";

export const metadata = { title: "Admin — Rejected" };

export default async function AdminRejectedPage() {
  const requests = await getRequests("rejected");

  if (requests.length === 0) {
    return <p className="text-sm t-nav">No rejected requests.</p>;
  }

  return (
    <div className="space-y-4">
      {requests.map((r) => (
        <RequestCard key={r.id} data={r} />
      ))}
    </div>
  );
}
