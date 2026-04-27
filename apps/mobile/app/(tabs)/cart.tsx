import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice, MIN_ORDER_FREE_DELIVERY_UZS } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import { useCartStore } from "@/stores/cart";
import type { CartItem } from "@tasgo/types";

function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemImage}>
        {item.productImage ? (
          <Image source={{ uri: item.productImage }} style={styles.itemImageImg} />
        ) : (
          <Text style={{ fontSize: 24 }}>🛒</Text>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
        <Text style={styles.itemPrice}>{formatPrice(item.priceUzs)}</Text>
      </View>
      <View style={styles.itemControls}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQuantity(item.productId, item.quantity - 1)}
        >
          <Ionicons
            name={item.quantity === 1 ? "trash-outline" : "remove"}
            size={16}
            color={item.quantity === 1 ? colors.status.error : colors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQuantity(item.productId, item.quantity + 1)}
        >
          <Ionicons name="add" size={16} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const { t } = useTranslation();
  const {
    items,
    subtotalTiyin,
    deliveryFeeTiyin,
    totalTiyin,
    promoCode,
    promoDiscount,
    clearCart,
    applyPromo,
    clearPromo,
  } = useCartStore();
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const { data: promo, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoInput.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !promo) {
        setPromoError(t("cart.promoInvalid"));
        return;
      }

      const now = Date.now();
      if (promo.valid_from && new Date(promo.valid_from).getTime() > now) {
        setPromoError(t("cart.promoInvalid"));
        return;
      }
      if (promo.valid_until && new Date(promo.valid_until).getTime() < now) {
        setPromoError(t("cart.promoInvalid"));
        return;
      }
      if (promo.min_order_uzs && subtotalTiyin / 100 < promo.min_order_uzs) {
        setPromoError(`Minimal buyurtma: ${formatPrice(promo.min_order_uzs * 100)}`);
        return;
      }
      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        setPromoError(t("cart.promoInvalid"));
        return;
      }

      let discount = 0;
      if (promo.discount_type === "percent") {
        discount = Math.round(subtotalTiyin * promo.discount_value / 100);
      } else {
        discount = promo.discount_value * 100; // convert uzs to tiyin
      }
      applyPromo(promo.code, discount);
      setPromoInput("");
    } catch {
      setPromoError(t("cart.promoInvalid"));
    } finally {
      setPromoLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("cart.title")}</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 64 }}>🛒</Text>
          <Text style={styles.emptyTitle}>{t("cart.empty")}</Text>
          <Text style={styles.emptySubtitle}>{t("cart.emptySubtitle")}</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/(tabs)/index")}
          >
            <Text style={styles.shopButtonText}>{t("cart.startShopping")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("cart.title")}</Text>
        <TouchableOpacity
          onPress={() => Alert.alert(t("cart.clearCart"), t("cart.clearCartConfirm"), [
            { text: t("common.cancel"), style: "cancel" },
            { text: t("common.confirm"), style: "destructive", onPress: clearCart },
          ])}
        >
          <Ionicons name="trash-outline" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <CartItemRow item={item} />}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.footer}>
            {/* Promo code */}
            <View style={styles.promoContainer}>
              <TextInput
                style={styles.promoInput}
                value={promoInput}
                onChangeText={setPromoInput}
                placeholder={t("cart.promoCodePlaceholder")}
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.promoButton}
                onPress={promoCode ? clearPromo : handleApplyPromo}
                disabled={promoLoading}
              >
                <Text style={styles.promoButtonText}>
                  {promoCode ? "✕" : t("cart.applyPromo")}
                </Text>
              </TouchableOpacity>
            </View>
            {promoError ? (
              <Text style={styles.promoError}>{promoError}</Text>
            ) : null}
            {promoCode && (
              <Text style={styles.promoSuccess}>
                {t("cart.promoApplied", { discount: formatPrice(promoDiscount) })}
              </Text>
            )}

            {/* Totals */}
            <View style={styles.totals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("cart.subtotal")}</Text>
                <Text style={styles.totalValue}>{formatPrice(subtotalTiyin)}</Text>
              </View>
              {promoDiscount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.status.success }]}>
                    Chegirma
                  </Text>
                  <Text style={[styles.totalValue, { color: colors.status.success }]}>
                    -{formatPrice(promoDiscount)}
                  </Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("cart.deliveryFee")}</Text>
                <Text style={styles.totalValue}>
                  {deliveryFeeTiyin === 0 ? t("common.free") : formatPrice(deliveryFeeTiyin)}
                </Text>
              </View>
              {deliveryFeeTiyin > 0 && (
                <Text style={styles.deliveryHint}>
                  {formatPrice(MIN_ORDER_FREE_DELIVERY_UZS * 100)} dan oshsa bepul yetkaziladi
                </Text>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>{t("cart.total")}</Text>
                <Text style={styles.grandTotalValue}>{formatPrice(totalTiyin)}</Text>
              </View>
            </View>
          </View>
        }
      />

      {/* Place order button */}
      <View style={styles.checkoutBar}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => router.push("/checkout")}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutButtonText}>{t("cart.placeOrder")}</Text>
          <Text style={styles.checkoutButtonPrice}>{formatPrice(totalTiyin)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[8],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    textAlign: "center",
  },
  shopButton: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    marginTop: spacing[3],
  },
  shopButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  listContent: { paddingBottom: spacing[6] },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.card,
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...shadows.sm,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface.hover,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemImageImg: { width: 56, height: 56 },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  itemPrice: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  itemControls: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    minWidth: 20,
    textAlign: "center",
  },
  footer: { padding: spacing[4], gap: spacing[4] },
  promoContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    overflow: "hidden",
  },
  promoInput: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  promoButton: {
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing[4],
    alignItems: "center",
    justifyContent: "center",
  },
  promoButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  promoError: {
    fontSize: typography.fontSize.xs,
    color: colors.status.error,
    fontFamily: typography.fontFamily.regular,
  },
  promoSuccess: {
    fontSize: typography.fontSize.xs,
    color: colors.status.success,
    fontFamily: typography.fontFamily.medium,
  },
  totals: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing[3],
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  totalValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  deliveryHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
  },
  grandTotalRow: {
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  grandTotalLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  grandTotalValue: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[800],
  },
  checkoutBar: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  checkoutButton: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadows.md,
  },
  checkoutButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  checkoutButtonPrice: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
});
