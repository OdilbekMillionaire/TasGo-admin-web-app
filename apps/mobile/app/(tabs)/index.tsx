import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import { useCartStore } from "@/stores/cart";
import type { Database } from "@tasgo/types";

const { width: SCREEN_W } = Dimensions.get("window");

type Product = Database["public"]["Tables"]["products"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Banner = Database["public"]["Tables"]["banners"]["Row"];

// ---- Data Fetching ----

function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });
}

function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });
}

function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_featured", true)
        .gt("stock_quantity", 0)
        .limit(10);
      return data ?? [];
    },
  });
}

function useOnSaleProducts() {
  return useQuery({
    queryKey: ["products", "on-sale"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("has_discount", true)
        .gt("stock_quantity", 0)
        .limit(10);
      return data ?? [];
    },
  });
}

// ---- Sub-components ----

function BannerCarousel({ banners }: { banners: Banner[] }) {
  const scrollRef = useRef<FlatList>(null);
  const currentIndex = useRef(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % banners.length;
      scrollRef.current?.scrollToIndex({ index: currentIndex.current, animated: true });
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <FlatList
      ref={scrollRef}
      data={banners}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.bannerItem, { width: SCREEN_W - spacing[6] * 2 }]}
          activeOpacity={0.92}
        >
          <Image
            source={{ uri: item.image_url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          {item.title_uz_latn && (
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerTitle}>{item.title_uz_latn}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      contentContainerStyle={{ gap: spacing[3] }}
    />
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const discountedPrice = product.has_discount
    ? Math.round(product.price_uzs * (1 - product.discount_percent / 100))
    : product.price_uzs;

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={0.88}
    >
      <View style={styles.productImageContainer}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Text style={{ fontSize: 32 }}>🛒</Text>
          </View>
        )}
        {product.has_discount && product.discount_percent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-{product.discount_percent}%</Text>
          </View>
        )}
        {product.stock_quantity === 0 && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Tugadi</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name_uz_latn}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(discountedPrice)}</Text>
          {product.has_discount && (
            <Text style={styles.originalPrice}>{formatPrice(product.price_uzs)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addButton, product.stock_quantity === 0 && styles.addButtonDisabled]}
          onPress={onAdd}
          disabled={product.stock_quantity === 0}
        >
          <Ionicons name="add" size={18} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => router.push(`/category/${category.id}`)}
      activeOpacity={0.85}
    >
      {category.image_url ? (
        <Image source={{ uri: category.image_url }} style={styles.categoryImage} />
      ) : (
        <View style={[styles.categoryImage, styles.categoryImagePlaceholder]}>
          <Text style={{ fontSize: 28 }}>🛒</Text>
        </View>
      )}
      <Text style={styles.categoryName} numberOfLines={2}>
        {category.name_uz_latn}
      </Text>
    </TouchableOpacity>
  );
}

// ---- Main Screen ----

export default function HomeScreen() {
  const { t } = useTranslation();
  const { addItem, totalItems } = useCartStore();
  const { data: banners = [], isLoading: bannersLoading } = useBanners();
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: featured = [], isLoading: featuredLoading } = useFeaturedProducts();
  const { data: onSale = [], isLoading: saleLoading } = useOnSaleProducts();

  const loading = bannersLoading || catsLoading || featuredLoading || saleLoading;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoMini}>
            <Text style={styles.logoMiniText}>TG</Text>
          </View>
          <Text style={styles.brandText}>TasGo</Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/search")}
            style={styles.iconButton}
          >
            <Ionicons name="search-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/cart")}
            style={styles.iconButton}
          >
            <Ionicons name="cart-outline" size={22} color={colors.text.primary} />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems > 99 ? "99+" : totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[800]} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Banner carousel */}
          {banners.length > 0 && (
            <View style={styles.section}>
              <BannerCarousel banners={banners} />
            </View>
          )}

          {/* Featured products */}
          {featured.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("home.featured")}</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/search")}>
                  <Text style={styles.seeAll}>{t("home.seeAll")}</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={featured}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    onAdd={() =>
                      addItem({
                        productId: item.id,
                        productName: item.name_uz_latn,
                        productImage: item.image_url,
                        priceUzs: item.has_discount
                          ? Math.round(item.price_uzs * (1 - item.discount_percent / 100))
                          : item.price_uzs,
                        quantity: 1,
                      })
                    }
                  />
                )}
                contentContainerStyle={{ gap: spacing[3], paddingHorizontal: spacing[6] }}
              />
            </View>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: spacing[6] }]}>
                {t("home.categories")}
              </Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <CategoryCard key={cat.id} category={cat} />
                ))}
              </View>
            </View>
          )}

          {/* On sale */}
          {onSale.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("home.onSale")}</Text>
              </View>
              <FlatList
                data={onSale}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    onAdd={() =>
                      addItem({
                        productId: item.id,
                        productName: item.name_uz_latn,
                        productImage: item.image_url,
                        priceUzs: Math.round(item.price_uzs * (1 - item.discount_percent / 100)),
                        quantity: 1,
                      })
                    }
                  />
                )}
                contentContainerStyle={{ gap: spacing[3], paddingHorizontal: spacing[6] }}
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const CARD_W = 160;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  logoMini: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary[800],
    alignItems: "center",
    justifyContent: "center",
  },
  logoMiniText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  brandText: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  topBarActions: { flexDirection: "row", gap: spacing[2] },
  iconButton: { padding: spacing[2], position: "relative" },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.accent[500],
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: spacing[8] },
  section: { marginTop: spacing[5] },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[6],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  seeAll: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[800],
  },
  // Banner
  bannerItem: {
    height: 160,
    borderRadius: borderRadius["2xl"],
    overflow: "hidden",
    marginHorizontal: spacing[6],
    ...shadows.md,
  },
  bannerImage: { width: "100%", height: "100%" },
  bannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  bannerTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: "#FFFFFF",
  },
  // Product card
  productCard: {
    width: CARD_W,
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  productImageContainer: { position: "relative" },
  productImage: { width: CARD_W, height: 130 },
  productImagePlaceholder: {
    backgroundColor: colors.surface.hover,
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadge: {
    position: "absolute",
    top: spacing[2],
    left: spacing[2],
    backgroundColor: colors.accent[500],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.secondary,
  },
  productInfo: { padding: spacing[3] },
  productName: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing[1],
    minHeight: 32,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing[1], marginBottom: spacing[2] },
  price: {
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
  addButton: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  addButtonDisabled: { backgroundColor: colors.surface.border },
  // Category grid
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  categoryCard: {
    width: (SCREEN_W - spacing[6] * 2 - spacing[3] * 3) / 4,
    alignItems: "center",
    gap: spacing[2],
  },
  categoryImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface.hover,
  },
  categoryImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: "center",
  },
});
