import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import type { Database } from "@tasgo/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const STATUS_SEQUENCE: OrderStatus[] = [
  "placed",
  "collector_assigned",
  "collecting",
  "ready_for_pickup",
  "carrier_assigned",
  "in_transit",
  "delivered",
];

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  placed: "checkmark-circle-outline",
  collector_assigned: "person-outline",
  collecting: "basket-outline",
  ready_for_pickup: "cube-outline",
  carrier_assigned: "bicycle-outline",
  in_transit: "navigate-outline",
  delivered: "checkmark-done-circle-outline",
  cancelled: "close-circle-outline",
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const { data: order, isLoading: loadingOrder } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === "delivered" || status === "cancelled") return false;
      return 10000;
    },
  });

  const { data: orderItems = [], isLoading: loadingItems } = useQuery<OrderItem[]>({
    queryKey: ["order-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  if (loadingOrder || loadingItems) {
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

  if (!order) {
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

  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const isInTransit = order.status === "in_transit";
  const currentStepIndex = isCancelled ? -1 : STATUS_SEQUENCE.indexOf(order.status);

  const placedDate = new Date(order.placed_at);
  const dateStr = placedDate.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.backBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.backBarTitle}>
          {t("orders.orderNumber", { number: order.order_number })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, isCancelled && styles.statusBannerCancelled, isDelivered && styles.statusBannerDelivered]}>
          <Ionicons
            name={STATUS_ICON[order.status] ?? "help-circle-outline"}
            size={28}
            color={isCancelled ? colors.status.error : isDelivered ? colors.status.success : colors.primary[800]}
          />
          <View style={styles.statusBannerText}>
            <Text style={[styles.statusBannerTitle, isCancelled && { color: colors.status.error }, isDelivered && { color: colors.status.success }]}>
              {t(`orders.status.${order.status.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}` as Parameters<typeof t>[0])}
            </Text>
            <Text style={styles.statusBannerDate}>{dateStr}</Text>
          </View>
        </View>

        {/* Track button for in_transit */}
        {isInTransit && (
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => router.push(`/tracking/${order.id}`)}
          >
            <Ionicons name="navigate" size={16} color={colors.text.inverse} />
            <Text style={styles.trackBtnText}>{t("orders.trackLive")}</Text>
          </TouchableOpacity>
        )}

        {/* Status timeline */}
        {!isCancelled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("orders.statusTimeline")}</Text>
            <View style={styles.timeline}>
              {STATUS_SEQUENCE.map((status, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isLast = index === STATUS_SEQUENCE.length - 1;
                return (
                  <View key={status} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotActive,
                        isCurrent && styles.timelineDotCurrent,
                      ]}>
                        {isCompleted && (
                          <Ionicons
                            name={isCurrent ? "ellipse" : "checkmark"}
                            size={10}
                            color="#fff"
                          />
                        )}
                      </View>
                      {!isLast && (
                        <View style={[styles.timelineLine, index < currentStepIndex && styles.timelineLineActive]} />
                      )}
                    </View>
                    <Text style={[
                      styles.timelineLabel,
                      isCompleted && styles.timelineLabelActive,
                      isCurrent && styles.timelineLabelCurrent,
                    ]}>
                      {t(`orders.status.${status.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}` as Parameters<typeof t>[0])}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Delivery address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("checkout.deliveryAddress")}</Text>
          <View style={styles.card}>
            <Ionicons name="location-outline" size={18} color={colors.primary[800]} />
            <Text style={styles.addressText}>{order.delivery_address}</Text>
          </View>
        </View>

        {/* Order items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("orders.items")}</Text>
          <View style={styles.itemsCard}>
            {orderItems.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={styles.itemDivider} />}
                <View style={styles.itemRow}>
                  <View style={styles.itemQtyBadge}>
                    <Text style={styles.itemQtyText}>{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemName} numberOfLines={2}>{item.product_name_snapshot}</Text>
                  <Text style={styles.itemPrice}>{formatPrice(item.subtotal_uzs)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("cart.total")}</Text>
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("cart.subtotal")}</Text>
              <Text style={styles.totalValue}>{formatPrice(order.subtotal_uzs)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("cart.deliveryFee")}</Text>
              <Text style={styles.totalValue}>
                {order.delivery_fee_uzs === 0 ? t("common.free") : formatPrice(order.delivery_fee_uzs)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.grandLabel}>{t("cart.total")}</Text>
              <Text style={styles.grandValue}>{formatPrice(order.total_uzs)}</Text>
            </View>
          </View>
        </View>

        {/* Rating CTA */}
        {isDelivered && !order.rating && (
          <TouchableOpacity
            style={styles.ratingBtn}
            onPress={() => router.push(`/rating/${order.id}`)}
          >
            <Text style={{ fontSize: 24 }}>⭐</Text>
            <Text style={styles.ratingBtnText}>{t("rating.leaveReview")}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary[800]} />
          </TouchableOpacity>
        )}

        {isDelivered && order.rating && (
          <View style={styles.ratingDisplay}>
            <Text style={styles.ratingDisplayLabel}>{t("rating.yourRating")}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= (order.rating ?? 0) ? "star" : "star-outline"}
                  size={20}
                  color={colors.accent[500]}
                />
              ))}
            </View>
            {order.rating_comment && (
              <Text style={styles.ratingComment}>{order.rating_comment}</Text>
            )}
          </View>
        )}
      </ScrollView>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
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
  backBarTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  scroll: { padding: spacing[4], gap: spacing[4] },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    backgroundColor: colors.primary[800] + "12",
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary[800] + "30",
  },
  statusBannerCancelled: {
    backgroundColor: colors.status.error + "12",
    borderColor: colors.status.error + "30",
  },
  statusBannerDelivered: {
    backgroundColor: colors.status.success + "12",
    borderColor: colors.status.success + "30",
  },
  statusBannerText: { flex: 1, gap: 2 },
  statusBannerTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[800],
  },
  statusBannerDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3],
    ...shadows.sm,
  },
  trackBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  section: { gap: spacing[3] },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
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
    lineHeight: 20,
  },
  timeline: { gap: 0 },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[4],
  },
  timelineLeft: { alignItems: "center", width: 20 },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface.border,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface.border,
  },
  timelineDotActive: {
    backgroundColor: colors.primary[800],
    borderColor: colors.primary[800],
  },
  timelineDotCurrent: {
    backgroundColor: colors.primary[800],
    borderColor: colors.primary[800],
  },
  timelineLine: {
    width: 2,
    height: 28,
    backgroundColor: colors.surface.border,
    marginVertical: 2,
  },
  timelineLineActive: { backgroundColor: colors.primary[800] },
  timelineLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    paddingTop: 2,
    paddingBottom: spacing[4],
  },
  timelineLabelActive: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
  },
  timelineLabelCurrent: {
    color: colors.primary[800],
    fontFamily: typography.fontFamily.bold,
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
  itemDivider: { height: 1, backgroundColor: colors.surface.border, marginHorizontal: spacing[4] },
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
  divider: { height: 1, backgroundColor: colors.surface.border },
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
  ratingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.accent[500] + "60",
    ...shadows.sm,
  },
  ratingBtnText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  ratingDisplay: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing[2],
    ...shadows.sm,
  },
  ratingDisplayLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stars: { flexDirection: "row", gap: spacing[1] },
  ratingComment: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
