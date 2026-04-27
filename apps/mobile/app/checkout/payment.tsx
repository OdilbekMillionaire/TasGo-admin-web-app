import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import { useCartStore } from "@/stores/cart";

export default function CheckoutPaymentScreen() {
  const { lat, lng, address } = useLocalSearchParams<{
    lat: string;
    lng: string;
    address: string;
  }>();
  const { t } = useTranslation();
  const { items, subtotalTiyin, deliveryFeeTiyin, totalTiyin, promoDiscount, promoCode, clearCart } =
    useCartStore();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  async function handlePay() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            priceUzs: i.priceUzs,
            productName: i.productName,
          })),
          deliveryAddress: address,
          deliveryLat: parseFloat(lat),
          deliveryLng: parseFloat(lng),
          subtotalUzs: Math.round(subtotalTiyin / 100),
          deliveryFeeUzs: Math.round(deliveryFeeTiyin / 100),
          totalUzs: Math.round(totalTiyin / 100),
          promoCode: promoCode ?? undefined,
          promoDiscountUzs: promoDiscount > 0 ? Math.round(promoDiscount / 100) : undefined,
          clientNote: note.trim() || undefined,
        },
      });

      if (error || !data?.paymentUrl) {
        throw new Error(error?.message ?? "Payment URL not returned");
      }

      router.replace({
        pathname: "/checkout/webview",
        params: { url: data.paymentUrl, orderId: data.orderId },
      });
    } catch (err) {
      Alert.alert(t("errors.generic"), err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("checkout.orderSummary")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Delivery address */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("checkout.deliveryAddress")}</Text>
          <View style={styles.addressCard}>
            <Ionicons name="location-outline" size={18} color={colors.primary[800]} />
            <Text style={styles.addressText}>{address}</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="pencil-outline" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("orders.items")}</Text>
          <View style={styles.itemsCard}>
            {items.map((item, index) => (
              <View key={item.productId}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.itemRow}>
                  <View style={styles.itemQtyBadge}>
                    <Text style={styles.itemQtyText}>{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                  <Text style={styles.itemPrice}>{formatPrice(item.priceUzs * item.quantity)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("cart.subtotal")}</Text>
              <Text style={styles.totalValue}>{formatPrice(subtotalTiyin)}</Text>
            </View>
            {promoDiscount > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.status.success }]}>
                  {t("cart.promoApplied", { discount: formatPrice(promoDiscount) })}
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
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>{t("cart.total")}</Text>
              <Text style={styles.grandValue}>{formatPrice(totalTiyin)}</Text>
            </View>
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("checkout.paymentMethod")}</Text>
          <View style={styles.paymentCard}>
            <Ionicons name="card-outline" size={22} color={colors.primary[800]} />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>Octo Pay</Text>
              <Text style={styles.paymentSub}>Uzcard, Humo, Visa, Mastercard</Text>
            </View>
            <View style={styles.radioActive}>
              <View style={styles.radioInner} />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payBtn, loading && styles.payBtnLoading]}
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Text style={styles.payBtnText}>{t("checkout.payNow")}</Text>
              <Text style={styles.payBtnPrice}>{formatPrice(totalTiyin)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
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
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  scroll: { padding: spacing[4], gap: spacing[4] },
  section: { gap: spacing[3] },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...shadows.sm,
  },
  addressText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  itemsCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
  },
  divider: { height: 1, backgroundColor: colors.surface.border, marginHorizontal: spacing[4] },
  itemQtyBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[800] + "15",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[2],
  },
  itemQtyText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[800],
  },
  itemName: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  itemPrice: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  totalsCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing[3],
    ...shadows.sm,
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
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  grandLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  grandValue: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[800],
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1.5,
    borderColor: colors.primary[800],
    ...shadows.sm,
  },
  paymentInfo: { flex: 1 },
  paymentName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  paymentSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  radioActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary[800],
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[800],
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  payBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadows.md,
  },
  payBtnLoading: { justifyContent: "center" },
  payBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  payBtnPrice: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
});
