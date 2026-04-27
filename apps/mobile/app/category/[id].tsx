import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
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
type Category = Database["public"]["Tables"]["categories"]["Row"];

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { addItem } = useCartStore();

  const { data: category } = useQuery<Category>({
    queryKey: ["category", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["category-products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", id)
        .eq("is_active", true)
        .order("name_uz_latn");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const lang = i18n.language as string;

  function getCategoryName(cat: Category): string {
    return (
      (lang === "ru" ? cat.name_ru :
       lang === "uz-cyrl" ? cat.name_uz_cyrl :
       lang === "en" ? cat.name_en :
       null) ?? cat.name_uz_latn
    );
  }

  function getProductName(p: Product): string {
    return (
      (lang === "ru" ? p.name_ru :
       lang === "uz-cyrl" ? p.name_uz_cyrl :
       lang === "en" ? p.name_en :
       null) ?? p.name_uz_latn
    );
  }

  const title = category ? getCategoryName(category) : t("catalog.title");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[800]} size="large" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>📦</Text>
          <Text style={styles.emptyText}>{t("catalog.noResults")}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: spacing[3] }}
          renderItem={({ item }) => {
            const price = item.has_discount
              ? Math.round(item.price_uzs * (1 - item.discount_percent / 100))
              : item.price_uzs;
            const name = getProductName(item);
            const isOutOfStock = item.stock_quantity === 0;

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/product/${item.id}`)}
                activeOpacity={0.88}
              >
                <View style={styles.cardImage}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.cardImageImg} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 36 }}>🛒</Text>
                  )}
                  {item.has_discount && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>-{item.discount_percent}%</Text>
                    </View>
                  )}
                  {isOutOfStock && (
                    <View style={styles.outOfStockOverlay}>
                      <Text style={styles.outOfStockText}>{t("catalog.outOfStock")}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.cardPrice}>{formatPrice(price)}</Text>
                    {item.has_discount && (
                      <Text style={styles.originalPrice}>{formatPrice(item.price_uzs)}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled]}
                    onPress={() =>
                      addItem({
                        productId: item.id,
                        productName: item.name_uz_latn,
                        productImage: item.image_url,
                        priceUzs: price,
                        quantity: 1,
                      })
                    }
                    disabled={isOutOfStock}
                  >
                    <Text style={styles.addBtnText}>
                      {isOutOfStock ? t("common.outOfStock") : t("catalog.addToCart")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
    gap: spacing[3],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    textAlign: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[3] },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  grid: { padding: spacing[4], gap: spacing[3] },
  card: {
    flex: 1,
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...shadows.sm,
  },
  cardImage: {
    height: 130,
    backgroundColor: colors.surface.hover,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cardImageImg: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: spacing[2],
    left: spacing[2],
    backgroundColor: colors.accent[500],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: "#fff",
  },
  cardInfo: { padding: spacing[3], gap: spacing[2] },
  cardName: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    minHeight: 30,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  cardPrice: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  originalPrice: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    textDecorationLine: "line-through",
  },
  addBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    alignItems: "center",
  },
  addBtnDisabled: { backgroundColor: colors.surface.border },
  addBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
});
