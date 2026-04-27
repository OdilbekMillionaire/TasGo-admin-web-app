import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import { useCartStore } from "@/stores/cart";
import type { Database } from "@tasgo/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export default function SearchScreen() {
  const { t } = useTranslation();
  const { addItem } = useCartStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .or(`name_uz_latn.ilike.%${q}%,name_ru.ilike.%${q}%,barcode.ilike.%${q}%`)
      .limit(30);
    setResults(data ?? []);
    setLoading(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={(v) => {
            setQuery(v);
            void handleSearch(v);
          }}
          placeholder={t("home.search")}
          placeholderTextColor={colors.text.tertiary}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => handleSearch(query)}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[800]} />
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text style={styles.noResultsTitle}>{t("catalog.noResults")}</Text>
          <Text style={styles.noResultsSub}>{t("catalog.noResultsSubtitle")}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: spacing[3] }}
          renderItem={({ item }) => {
            const price = item.has_discount
              ? Math.round(item.price_uzs * (1 - item.discount_percent / 100))
              : item.price_uzs;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/product/${item.id}`)}
                activeOpacity={0.88}
              >
                <View style={styles.cardImage}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.cardImageImg} />
                  ) : (
                    <Text style={{ fontSize: 36 }}>🛒</Text>
                  )}
                  {item.has_discount && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>-{item.discount_percent}%</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={2}>{item.name_uz_latn}</Text>
                  <Text style={styles.cardPrice}>{formatPrice(price)}</Text>
                  <TouchableOpacity
                    style={[styles.addBtn, item.stock_quantity === 0 && styles.addBtnDisabled]}
                    onPress={() =>
                      addItem({
                        productId: item.id,
                        productName: item.name_uz_latn,
                        productImage: item.image_url,
                        priceUzs: price,
                        quantity: 1,
                      })
                    }
                    disabled={item.stock_quantity === 0}
                  >
                    <Text style={styles.addBtnText}>
                      {item.stock_quantity === 0 ? t("common.outOfStock") : t("catalog.addToCart")}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: spacing[4],
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary[800],
    paddingHorizontal: spacing[4],
    ...shadows.sm,
  },
  searchIcon: { marginRight: spacing[2] },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.primary,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[3] },
  noResultsTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  noResultsSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
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
  badgeText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, color: colors.text.primary },
  cardInfo: { padding: spacing[3], gap: spacing[2] },
  cardName: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium, color: colors.text.primary, minHeight: 30 },
  cardPrice: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold, color: colors.text.primary },
  addBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    alignItems: "center",
  },
  addBtnDisabled: { backgroundColor: colors.surface.border },
  addBtnText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, color: colors.text.inverse },
});
