import { supabaseAdmin } from "@/lib/supabase-admin";
import { ProductForm } from "@/components/catalog/ProductForm";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!product) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-[#1C1C1A] mb-6">
        Mahsulotni tahrirlash: {product.name_uz_latn}
      </h1>
      <ProductForm product={product} />
    </div>
  );
}
