"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@tasgo/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    barcode: product?.barcode ?? "",
    name_uz_latn: product?.name_uz_latn ?? "",
    name_uz_cyrl: product?.name_uz_cyrl ?? "",
    name_ru: product?.name_ru ?? "",
    name_en: product?.name_en ?? "",
    description_uz_latn: product?.description_uz_latn ?? "",
    description_uz_cyrl: product?.description_uz_cyrl ?? "",
    description_ru: product?.description_ru ?? "",
    description_en: product?.description_en ?? "",
    category_id: product?.category_id ?? "",
    price_uzs: product ? Math.round(product.price_uzs / 100).toString() : "",
    low_stock_threshold: product?.low_stock_threshold?.toString() ?? "10",
    is_featured: product?.is_featured ?? false,
    has_discount: product?.has_discount ?? false,
    discount_percent: product?.discount_percent?.toString() ?? "0",
    is_active: product?.is_active ?? true,
  });

  useEffect(() => {
    supabaseAdmin
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAutoTranslate() {
    if (!form.name_uz_latn.trim()) {
      setError("Avval uzbek (lotin) nomini kiriting");
      return;
    }
    setTranslating(true);
    setError("");
    try {
      const res = await fetch("/api/translate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameUzLatn: form.name_uz_latn,
          descriptionUzLatn: form.description_uz_latn || undefined,
        }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json() as {
        nameUzCyrl: string;
        nameRu: string;
        nameEn: string;
        descriptionUzCyrl?: string;
        descriptionRu?: string;
        descriptionEn?: string;
      };
      setForm((prev) => ({
        ...prev,
        name_uz_cyrl: data.nameUzCyrl,
        name_ru: data.nameRu,
        name_en: data.nameEn,
        description_uz_cyrl: data.descriptionUzCyrl ?? prev.description_uz_cyrl,
        description_ru: data.descriptionRu ?? prev.description_ru,
        description_en: data.descriptionEn ?? prev.description_en,
      }));
    } catch {
      setError("Tarjima amalga oshmadi. Keyinroq urinib ko'ring.");
    } finally {
      setTranslating(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return product?.image_url ?? null;
    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const path = `products/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(path, imageFile, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(path);
    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name_uz_latn.trim()) {
      setError("Uzbek (lotin) nomi majburiy");
      return;
    }
    if (!form.price_uzs || isNaN(Number(form.price_uzs))) {
      setError("Narx to'g'ri kiritilmagan");
      return;
    }

    setSaving(true);
    try {
      const imageUrl = await uploadImage();
      const payload = {
        barcode: form.barcode || null,
        name_uz_latn: form.name_uz_latn.trim(),
        name_uz_cyrl: form.name_uz_cyrl || null,
        name_ru: form.name_ru || null,
        name_en: form.name_en || null,
        description_uz_latn: form.description_uz_latn || null,
        description_uz_cyrl: form.description_uz_cyrl || null,
        description_ru: form.description_ru || null,
        description_en: form.description_en || null,
        category_id: form.category_id || null,
        price_uzs: Math.round(parseFloat(form.price_uzs) * 100), // convert to tiyin
        low_stock_threshold: parseInt(form.low_stock_threshold, 10) || 10,
        is_featured: form.is_featured,
        has_discount: form.has_discount,
        discount_percent: parseInt(form.discount_percent, 10) || 0,
        is_active: form.is_active,
        image_url: imageUrl,
      };

      if (product) {
        const { error: updateError } = await supabaseAdmin
          .from("products")
          .update(payload)
          .eq("id", product.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("products")
          .insert(payload);
        if (insertError) throw insertError;
      }

      router.push("/dashboard/catalog/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Image upload */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
        <h2 className="text-sm font-semibold text-[#1C1C1A] mb-3">Rasm</h2>
        <div className="flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-xl bg-[#F4F4F0] flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-[#E8E8E4] hover:border-[#2E7D32] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">📷</span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-[#2E7D32] font-medium hover:underline"
            >
              Rasm yuklash
            </button>
            <p className="text-xs text-[#ABABAB] mt-0.5">JPG, PNG — maks. 10MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
      </div>

      {/* Barcode */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#1C1C1A]">Shtrix kod</h2>
        <input
          type="text"
          value={form.barcode}
          onChange={(e) => update("barcode", e.target.value)}
          placeholder="Shtrix kodni kiriting..."
          className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
        />
      </div>

      {/* Names */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1C1C1A]">Nomi</h2>
          <button
            type="button"
            onClick={handleAutoTranslate}
            disabled={translating || !form.name_uz_latn.trim()}
            className="text-xs font-medium text-white bg-[#2E7D32] hover:bg-[#1B5E20] px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {translating ? "Tarjima qilinmoqda..." : "🌐 Avtomatik tarjima"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: "name_uz_latn", label: "O'zbek (lotin) *", required: true },
            { key: "name_uz_cyrl", label: "Ўзбек (кирил)" },
            { key: "name_ru", label: "Русский" },
            { key: "name_en", label: "English" },
          ].map(({ key, label, required }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">{label}</label>
              <input
                type="text"
                value={(form as Record<string, string | boolean>)[key] as string}
                onChange={(e) => update(key, e.target.value)}
                required={required}
                className="w-full px-3 py-2 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Descriptions */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#1C1C1A]">Tavsif</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: "description_uz_latn", label: "O'zbek (lotin)" },
            { key: "description_uz_cyrl", label: "Ўзбек (кирил)" },
            { key: "description_ru", label: "Русский" },
            { key: "description_en", label: "English" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[#6B6B67] mb-1">{label}</label>
              <textarea
                value={(form as Record<string, string | boolean>)[key] as string}
                onChange={(e) => update(key, e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32] resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Price, Category, Stock */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#1C1C1A]">Narx va ombor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Narx (so&apos;m) *</label>
            <input
              type="number"
              value={form.price_uzs}
              onChange={(e) => update("price_uzs", e.target.value)}
              required
              min="1"
              placeholder="25000"
              className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
            <p className="text-xs text-[#ABABAB] mt-0.5">So&apos;mda kiriting (tiyin emas)</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Kategoriya</label>
            <select
              value={form.category_id}
              onChange={(e) => update("category_id", e.target.value)}
              className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32] bg-white"
            >
              <option value="">Kategoriya tanlang</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_uz_latn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B6B67] mb-1">Kam qolish chegarasi</label>
            <input
              type="number"
              value={form.low_stock_threshold}
              onChange={(e) => update("low_stock_threshold", e.target.value)}
              min="0"
              className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>
        </div>
      </div>

      {/* Flags */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5">
        <h2 className="text-sm font-semibold text-[#1C1C1A] mb-3">Qo&apos;shimcha</h2>
        <div className="flex flex-wrap gap-6">
          {[
            { key: "is_featured", label: "Tanlangan (featured)" },
            { key: "is_active", label: "Faol" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(form as Record<string, boolean | string>)[key] as boolean}
                onChange={(e) => update(key, e.target.checked)}
                className="w-4 h-4 rounded accent-[#2E7D32]"
              />
              <span className="text-sm font-medium text-[#1C1C1A]">{label}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_discount}
              onChange={(e) => update("has_discount", e.target.checked)}
              className="w-4 h-4 rounded accent-[#2E7D32]"
            />
            <span className="text-sm font-medium text-[#1C1C1A]">Chegirma</span>
          </label>
          {form.has_discount && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.discount_percent}
                onChange={(e) => update("discount_percent", e.target.value)}
                min="0"
                max="99"
                className="w-20 px-2.5 py-1.5 border border-[#E8E8E4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
              />
              <span className="text-sm text-[#6B6B67]">%</span>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Saqlanmoqda..." : product ? "Saqlash" : "Qo'shish"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-[#E8E8E4] rounded-xl text-sm font-medium text-[#6B6B67] hover:bg-[#F4F4F0] transition-colors"
        >
          Bekor qilish
        </button>
      </div>
    </form>
  );
}
