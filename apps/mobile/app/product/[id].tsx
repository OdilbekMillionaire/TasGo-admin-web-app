import { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import { useCartStore } from "@/stores/cart";
import type { Database } from "@tasgo/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { addItem, items } = useCartStore();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.backBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[800]} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.backBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("errors.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const lang = i18n.language as string;
  const name =
    (lang === "ru" ? product.name_ru :
     lang === "uz-cyrl" ? product.name_uz_cyrl :
     lang === "en" ? product.name_en :
     null) ?? product.name_uz_latn;
  const description =
    (lang === "ru" ? product.description_ru :
     lang === "uz-cyrl" ? product.description_uz_cyrl :
     lang === "en" ? product.description_en :
     null) ?? product.description_uz_latn;

  const discountedPrice = product.has_discount
    ? Math.round(product.price_uzs * (1 - product.discount_percent / 100))
    : product.price_uzs;

  const inCart = items.find((i) => i.productId === product.id);
  const isOutOfStock = product.stock_quantity === 0;

  function handleAddToCart() {
    addItem({
      productId: product.id,
      productName: product.name_uz_latn,
      productImage: product.image_url,
      priceUzs: discountedPrice,
      quantity,
    });
    Alert.alert(t("catalog.addedToCart"), name ?? product.name_uz_latn, [
      { text: t("common.ok") },
      {
        text: t("cart.title"),
        onPress: () => router.push("/(tabs)/cart"),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.backBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/cart")}
          style={styles.cartBtn}
        >
          <Ionicons name="cart-outline" size={22} color={colors.text.primary} />
          {inCart && <View style={styles.cartDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 72 }}>🛒</Text>
            </View>
          )}
          {product.has_discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{product.discount_percent}%</Text>
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>{t("catalog.outOfStock")}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Name + stock */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            {!isOutOfStock && product.stock_quantity <= (product.low_stock_threshold ?? 10) && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockText}>
                  {t("catalog.lowStock", { count: product.stock_quantity })}
                </Text>
              </View>
            )}
          </View>

          {/* Barcode */}
          {product.barcode && (
            <Text style={styles.barcode}>
              <Text style={styles.barcodeLabel}>{t("catalog.barcode")}: </Text>
              {product.barcode}
            </Text>
          )}

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(discountedPrice)}</Text>
            {product.has_discount && (
              <Text style={styles.originalPrice}>{formatPrice(product.price_uzs)}</Text>
            )}
          </View>

          {/* Description */}
          {description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("catalog.description")}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          )}

          {/* Quantity selector */}
          {!isOutOfStock && (
            <View style={styles.quantitySection}>
              <Text style={styles.sectionTitle}>{t("catalog.quantity")}</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={[styles.qtyBtn, quantity === 1 && styles.qtyBtnDisabled]}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity === 1}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={quantity === 1 ? colors.text.tertiary : colors.text.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, quantity >= product.stock_quantity && styles.qtyBtnDisabled]}
                  onPress={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                  disabled={quantity >= product.stock_quantity}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={quantity >= product.stock_quantity ? colors.text.tertiary : colors.text.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.subtotalHint}>
                  = {formatPrice(discountedPrice * quantity)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled]}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>
            {isOutOfStock ? t("common.outOfStock") : t("catalog.addToCart")}
          </Text>
          {!isOutOfStock && (
            <Text style={styles.addBtnPrice}>{formatPrice(discountedPrice * quantity)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  backBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  cartDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent[500],
    borderWidth: 1.5,
    borderColor: colors.surface.bg,
  },
  scroll: { flex: 1 },
  imageContainer: {
    height: 280,
    backgroundColor: colors.surface.hover,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadge: {
    position: "absolute",
    top: spacing[3],
    left: spacing[3],
    backgroundColor: colors.accent[500],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  discountBadgeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: "#fff",
  },
  content: { padding: spacing[5], gap: spacing[4] },
  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3], flexWrap: "wrap" },
  name: {
    flex: 1,
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  lowStockBadge: {
    backgroundColor: "#FFF3CD",
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    marginTop: spacing[1],
  },
  lowStockText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: "#856404",
  },
  barcode: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
  },
  barcodeLabel: { fontFamily: typography.fontFamily.medium },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  price: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[800],
  },
  originalPrice: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    textDecorationLine: "line-through",
  },
  section: { gap: spacing[2] },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  description: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  quantitySection: { gap: spacing[3] },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.card,
  },
  qtyBtnDisabled: { borderColor: colors.surface.border, backgroundColor: colors.surface.hover },
  qtyText: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    minWidth: 32,
    textAlign: "center",
  },
  subtotalHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginLeft: spacing[2],
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  addBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadows.md,
  },
  addBtnDisabled: { backgroundColor: colors.surface.border },
  addBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  addBtnPrice: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
});
