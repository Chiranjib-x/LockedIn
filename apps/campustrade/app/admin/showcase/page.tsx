import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card } from "@suite/ui";
import { ShowcaseForm, MerchantForm } from "@/modules/showcase/forms";
import { ShowcaseAdminRow, MerchantAdminRow } from "@/modules/showcase/admin-client";

export default async function ShowcaseAdminPage() {
  const { supabase, user } = await requireUser();
  const { data: prof } = await supabase.from("profiles").select("is_moderator").eq("id", user.id).single();
  if (!prof?.is_moderator) notFound();

  const [{ data: items }, { data: merchants }] = await Promise.all([
    supabase.from("showcase_items").select("*").order("created_at", { ascending: false }),
    supabase.from("merchants").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6">
      <h1 className="text-2xl font-bold">Toolbox + Deals admin</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">🧰 Toolbox</h2>
        <Card><ShowcaseForm /></Card>
        <div className="flex flex-col gap-2">
          {items?.length === 0 && (
            <p className="text-sm text-muted-foreground">No tools yet — add the first one above.</p>
          )}
          {items?.map((it) => (
            <Card key={it.id} className={`flex items-center justify-between gap-3 ${it.is_active ? "" : "opacity-50"}`}>
              <div className="min-w-0">
                <p className="truncate font-medium">{it.name}</p>
                <p className="truncate text-xs text-muted-foreground">{it.url}</p>
              </div>
              <ShowcaseAdminRow id={it.id} isActive={it.is_active} />
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">🏷️ Deals</h2>
        <Card><MerchantForm /></Card>
        <div className="flex flex-col gap-2">
          {merchants?.length === 0 && (
            <p className="text-sm text-muted-foreground">No deals yet — add the first one above.</p>
          )}
          {merchants?.map((m) => (
            <Card key={m.id} className={`flex items-center justify-between gap-3 ${m.is_active ? "" : "opacity-50"}`}>
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.offer_text}</p>
              </div>
              <MerchantAdminRow id={m.id} isActive={m.is_active} />
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
