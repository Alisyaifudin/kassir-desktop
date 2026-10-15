import { useMutation } from "~/components/Loader";
import { service } from "~/services";

export function useLinkListing(recordListingId: string, currentListingId: string | null) {
  const { pending, error, mutate } = useMutation(
    (input: { recordListingId: string; listingId: string | null }) =>
      service.record.set.linkListing(input.recordListingId, input.listingId),
  );

  async function choose(listingId: string) {
    const next = currentListingId === listingId ? null : listingId;
    await mutate({ recordListingId, listingId: next });
    // The record service bumps the revision, so the detail re-reads itself.
  }

  return { loading: pending, error: error?.message ?? null, choose };
}
