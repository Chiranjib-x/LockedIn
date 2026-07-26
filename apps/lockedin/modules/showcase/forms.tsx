"use client";

import { useState } from "react";
import { inputClass } from "@suite/ui";
import { SubmitButton } from "@suite/ui";
import ImageUpload from "@/components/image-upload";
import { createShowcaseItem, createMerchant } from "./actions";

const TOOL_CATEGORIES = ["study", "productivity", "finance", "fun", "other"];
const DEAL_CATEGORIES = ["food", "print", "grocery", "services", "other"];

export function ShowcaseForm() {
  const [logo, setLogo] = useState<string[]>([]);
  return (
    <form action={createShowcaseItem} className="flex flex-col gap-3">
      <input type="hidden" name="logo_url" value={logo[0] ?? ""} />
      <ImageUpload bucket="showcase-images" value={logo} onChange={setLogo} max={1} />
      <input aria-label="Tool name" name="name" required placeholder="Tool name" className={inputClass} />
      <input aria-label="https://" name="url" required type="url" placeholder="https://…" className={inputClass} />
      <input aria-label="One line — why it's useful" name="tagline" placeholder="One line — why it's useful" className={inputClass} />
      <select aria-label="Category" name="category" className={inputClass} defaultValue="other">
        {TOOL_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <SubmitButton pendingLabel="Adding…">Add to Toolbox</SubmitButton>
    </form>
  );
}

export function MerchantForm() {
  const [logo, setLogo] = useState<string[]>([]);
  return (
    <form action={createMerchant} className="flex flex-col gap-3">
      <input type="hidden" name="logo_url" value={logo[0] ?? ""} />
      <ImageUpload bucket="showcase-images" value={logo} onChange={setLogo} max={1} />
      <input aria-label="Merchant / shop name" name="name" required placeholder="Merchant / shop name" className={inputClass} />
      <select aria-label="Category" name="category" className={inputClass} defaultValue="other">
        {DEAL_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input aria-label="Offer — e.g. 10% off with student ID" name="offer_text" required placeholder="Offer — e.g. 10% off with student ID" className={inputClass} />
      <textarea aria-label="Details (optional)" name="details" rows={2} placeholder="Details (optional)" className={inputClass} />
      <input aria-label="Link or contact (optional)" name="link_or_contact" placeholder="Link or contact (optional)" className={inputClass} />
      <SubmitButton pendingLabel="Adding…">Add deal</SubmitButton>
    </form>
  );
}
