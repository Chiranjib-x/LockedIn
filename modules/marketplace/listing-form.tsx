"use client";

import { useState } from "react";
import { Button, inputClass } from "@/components/ui";
import ImageUpload from "@/components/image-upload";
import { CATEGORIES, CONDITIONS } from "./constants";
import { saveListing } from "./actions";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  condition: string | null;
  images: string[];
};

export default function ListingForm({ listing, error }: { listing?: Listing; error?: string }) {
  const [images, setImages] = useState<string[]>(listing?.images ?? []);

  return (
    <form action={saveListing} className="flex flex-col gap-4">
      {listing?.id && <input type="hidden" name="id" value={listing.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Photos
        <ImageUpload value={images} onChange={setImages} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input name="title" required defaultValue={listing?.title} placeholder="e.g. Casio FX-991 calculator" className={inputClass} />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Price (₹)
          <input name="price" type="number" min={0} step="1" required defaultValue={listing?.price} className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Category
          <select name="category" required defaultValue={listing?.category ?? ""} className={inputClass}>
            <option value="" disabled>Pick one</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Condition
        <select name="condition" defaultValue={listing?.condition ?? ""} className={inputClass}>
          <option value="">Not specified</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Description
        <textarea name="description" rows={4} defaultValue={listing?.description ?? ""} placeholder="Condition details, why you're selling, meetup spot…" className={inputClass} />
      </label>

      <Button type="submit">{listing?.id ? "Save changes" : "Post listing"}</Button>
    </form>
  );
}
