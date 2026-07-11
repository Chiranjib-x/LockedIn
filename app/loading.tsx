import SpeederLoader from "@/components/speeder-loader";

// Root route-transition fallback: routes with their own loading.tsx keep
// their content-shaped skeletons; everything else gets the speeder.
export default function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <SpeederLoader />
    </main>
  );
}
