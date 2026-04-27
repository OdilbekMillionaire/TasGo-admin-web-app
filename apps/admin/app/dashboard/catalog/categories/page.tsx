"use client";

import { useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@tasgo/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  if (removed !== undefined) result.splice(endIndex, 0, removed);
  return result;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name_uz_latn: "", name_ru: "", name_en: "" });
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("sort_order");
    setCategories(data ?? []);
    setLoading(false);
  }

  useEffect(() => { void fetchCategories(); }, []);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index) return;

    const reordered = reorder(categories, result.source.index, result.destination.index);
    setCategories(reordered);

    setSavingOrder(true);
    try {
      await Promise.all(
        reordered.map((cat, i) =>
          supabaseAdmin.from("categories").update({ sort_order: i }).eq("id", cat.id)
        )
      );
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleSave() {
    if (!form.name_uz_latn.trim()) return;
    setSaving(true);
    if (editing) {
      await supabaseAdmin
        .from("categories")
        .update({ name_uz_latn: form.name_uz_latn, name_ru: form.name_ru || null, name_en: form.name_en || null })
        .eq("id", editing.id);
      setEditing(null);
    } else {
      await supabaseAdmin.from("categories").insert({
        name_uz_latn: form.name_uz_latn,
        name_ru: form.name_ru || null,
        name_en: form.name_en || null,
        sort_order: categories.length,
      });
      setAdding(false);
    }
    setForm({ name_uz_latn: "", name_ru: "", name_en: "" });
    await fetchCategories();
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabaseAdmin.from("categories").update({ is_active: !current }).eq("id", id);
    void fetchCategories();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1A]">Kategoriyalar</h1>
          {savingOrder && (
            <p className="text-xs text-[#2E7D32] mt-0.5">Tartib saqlanmoqda...</p>
          )}
        </div>
        <button
          onClick={() => { setAdding(true); setForm({ name_uz_latn: "", name_ru: "", name_en: "" }); }}
          className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          + Kategoriya qo&apos;shish
        </button>
      </div>

      {/* Add / Edit form */}
      {(adding || editing) && (
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#1C1C1A]">
            {editing ? "Tahrirlash" : "Yangi kategoriya"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: "name_uz_latn", label: "O'zbek (lotin) *" },
              { key: "name_ru", label: "Русский" },
              { key: "name_en", label: "English" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[#6B6B67] mb-1">{label}</label>
                <input
                  type="text"
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E8E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name_uz_latn.trim()}
              className="bg-[#2E7D32] text-white font-semibold text-sm px-4 py-2 rounded-xl disabled:opacity-50"
            >
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              onClick={() => { setAdding(false); setEditing(null); }}
              className="border border-[#E8E8E4] text-sm px-4 py-2 rounded-xl hover:bg-[#F4F4F0] transition-colors"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      )}

      {/* DnD list */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-[#6B6B67] text-sm">Yuklanmoqda...</div>
        ) : !mounted ? null : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF8] border-b border-[#E8E8E4]">
                <tr>
                  <th className="px-4 py-3 w-8" />
                  <th className="text-left px-4 py-3 font-semibold text-[#6B6B67] w-8">№</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Nomi</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Rus</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Holat</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B6B67]">Amal</th>
                </tr>
              </thead>
              <Droppable droppableId="categories">
                {(provided) => (
                  <tbody ref={provided.innerRef} {...provided.droppableProps}>
                    {categories.map((cat, i) => (
                      <Draggable key={cat.id} draggableId={cat.id} index={i}>
                        {(drag, snapshot) => (
                          <tr
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={`border-b border-[#E8E8E4] last:border-0 transition-colors ${
                              snapshot.isDragging
                                ? "bg-green-50 shadow-lg"
                                : "hover:bg-[#FAFAF8]"
                            }`}
                          >
                            {/* Drag handle */}
                            <td className="px-3 py-3 cursor-grab text-[#ABABAB] hover:text-[#6B6B67]" {...drag.dragHandleProps}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                <circle cx="4" cy="3" r="1.2" />
                                <circle cx="10" cy="3" r="1.2" />
                                <circle cx="4" cy="7" r="1.2" />
                                <circle cx="10" cy="7" r="1.2" />
                                <circle cx="4" cy="11" r="1.2" />
                                <circle cx="10" cy="11" r="1.2" />
                              </svg>
                            </td>
                            <td className="px-4 py-3 text-[#ABABAB]">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-[#1C1C1A]">{cat.name_uz_latn}</td>
                            <td className="px-4 py-3 text-[#6B6B67]">{cat.name_ru ?? "—"}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => toggleActive(cat.id, cat.is_active)}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                                  cat.is_active
                                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                              >
                                {cat.is_active ? "Faol" : "Nofaol"}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  setEditing(cat);
                                  setForm({ name_uz_latn: cat.name_uz_latn, name_ru: cat.name_ru ?? "", name_en: cat.name_en ?? "" });
                                  setAdding(false);
                                }}
                                className="text-[#2E7D32] text-xs font-medium hover:underline"
                              >
                                Tahrirlash
                              </button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </DragDropContext>
        )}
        {!loading && categories.length === 0 && (
          <div className="p-6 text-center text-[#6B6B67] text-sm">
            Kategoriyalar yo&apos;q. Yangi kategoriya qo&apos;shing.
          </div>
        )}
      </div>

      <p className="text-xs text-[#ABABAB]">
        Kategoriyalarni tartibini o&apos;zgartirish uchun qatorni sudrab olib boring.
      </p>
    </div>
  );
}
