import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import type { Database } from "@tasgo/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const ACTIVE_STATUSES: OrderStatus[] = [
  "placed",
  "collector_assigned",
  "collecting",
  "ready_for_pickup",
  "carrier_assigned",
  "in_transit",
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "orders.status.placed",
  collector_assigned: "orders.status.collectorAssigned",
  collecting: "orders.status.collecting",
  ready_for_pickup: "orders.status.readyForPickup",
  carrier_assigned: "orders.status.carrierAssigned",
  in_transit: "orders.status.inTransit",
  delivered: "orders.status.delivered",
  cancelled: "orders.status.cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: "#6C757D",
  collector_assigned: colors.primary[800],
  collecting: colors.primary[800],
  ready_for_pickup: "#0D6EFD",
  carrier_assigned: "#0D6EFD",
  in_transit: "#FFC107",
  delivered: "#198754",
  cancelled: "#DC3545",
};

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const { t } = useTranslation();
  const isActive = ACTIVE_STATUSES.includes(order.status);
  const statusColor = STATUS_COLORS[order.status] ?? colors.text.secondary;
  const statusLabel = t(STATUS_LABELS[order.status] ?? "orders.status.placed");

  const placedDate = new Date(order.placed_at);
  const dateStr = placedDate.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNumber}>#{order.order_number}</Text>
          <Text style={styles.orderDate}>{dateStr}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          {isActive && <View style={[styles.statusDot, { backgroundColor: statusColor }]} />}
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <Text style={styles.addressText} numberOfLines={1}>
          <Ionicons name="location-outline" size={12} color={colors.text.tertiary} />{" "}
          {order.delivery_address}
        </Text>
        <Text style={styles.totalText}>{formatPrice(order.total_uzs)}</Text>
      </View>

      {isActive && (
        <View style={styles.trackRow}>
          <Ionicons name="navigate-outline" size={14} color={colors.primary[800]} />
          <Text style={styles.trackText}>{t("orders.trackOrder")}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const { t } = useTranslation();

  const { data: activeOrders = [], isLoading: loadingActive } = useQuery<Order[]>({
    queryKey: ["orders", "active"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", user.id)
        .in("status", ACTIVE_STATUSES)
        .order("placed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const { data: pastOrders = [], isLoading: loadingPast } = useQuery<Order[]>({
    queryKey: ["orders", "past"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", user.id)
        .in("status", ["delivered", "cancelled"])
        .order("placed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = loadingActive || loadingPast;

  type Section =
    | { type: "header"; title: string }
    | { type: "order"; order: Order }
    | { type: "empty"; message: string };

  const sections: Section[] = [];

  if (activeOrders.length > 0) {
    sections.push({ type: "header", title: t("orders.active") });
    for (const o of activeOrders) sections.push({ type: "order", order: o });
  }

  sections.push({ type: "header", title: t("orders.history") });
  if (pastOrders.length === 0) {
    sections.push({ type: "empty", message: t("orders.noHistory") });
  } else {
    for (const o of pastOrders) sections.push({ type: "order", order: o });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("orders.title")}</Text>
      </View>

      {isLoading && activeOrders.length === 0 && pastOrders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[800]} size="large" />
        </View>
      ) : activeOrders.length === 0 && pastOrders.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 64 }}>📋</Text>
          <Text style={styles.emptyTitle}>{t("orders.empty")}</Text>
          <Text style={styles.emptySubtitle}>{t("orders.emptySubtitle")}</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push("/(tabs)/index")}>
            <Text style={styles.shopBtnText}>{t("cart.startShopping")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, index) =>
            item.type === "order" ? item.order.id : `${item.type}-${index}`
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <Text style={styles.sectionHeader}>{item.title}</Text>;
            }
            if (item.type === "empty") {
              return <Text style={styles.emptySection}>{item.message}</Text>;
            }
            return (
              <OrderCard
                order={item.order}
                onPress={() => router.push(`/orders/${item.order.id}`)}
              />
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[3] },
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
    paddingHorizontal: spacing[8],
  },
  shopBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    marginTop: spacing[2],
  },
  shopBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  list: { padding: spacing[4], gap: spacing[2] },
  sectionHeader: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  emptySection: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    paddingVertical: spacing[3],
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.surface.border,
    marginBottom: spacing[2],
    gap: spacing[3],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderNumber: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  orderDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.surface.border,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addressText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    marginRight: spacing[3],
  },
  totalText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.primary[800] + "10",
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  trackText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[800],
  },
});
