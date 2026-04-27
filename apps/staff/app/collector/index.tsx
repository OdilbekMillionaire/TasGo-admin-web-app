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

const COLLECTOR_ACTIVE_STATUSES = ["collector_assigned", "collecting", "ready_for_pickup"] as const;

export default function CollectorHomeScreen() {
  const { t } = useTranslation();

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["collector-orders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("collector_id", user.id)
        .in("status", COLLECTOR_ACTIVE_STATUSES)
        .order("placed_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  // Also listen for newly assigned orders (placed status, no collector yet — admin may assign manually)
  const { data: newOrders = [] } = useQuery<Order[]>({
    queryKey: ["collector-new-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "collector_assigned")
        .is("collector_id", null)
        .order("placed_at", { ascending: true });
      if (error) return [];
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const allOrders = [...orders, ...newOrders.filter((o) => !orders.find((e) => e.id === o.id))];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("staff.collector.title")}</Text>
        <TouchableOpacity onPress={() => void refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[800]} size="large" />
        </View>
      ) : allOrders.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text style={styles.emptyTitle}>{t("staff.collector.noOrders")}</Text>
          <Text style={styles.emptySubtitle}>{t("staff.collector.noOrdersSubtitle")}</Text>
        </View>
      ) : (
        <FlatList
          data={allOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isNew = item.status === "collector_assigned";
            const isCollecting = item.status === "collecting";
            const isReady = item.status === "ready_for_pickup";

            return (
              <TouchableOpacity
                style={[styles.card, isNew && styles.cardNew]}
                onPress={() => router.push(`/collector/order/${item.id}`)}
                activeOpacity={0.88}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderNumber}>#{item.order_number}</Text>
                    <Text style={styles.orderTime}>
                      {new Date(item.placed_at).toLocaleTimeString("uz-UZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    isNew && styles.statusBadgeNew,
                    isCollecting && styles.statusBadgeCollecting,
                    isReady && styles.statusBadgeReady,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      isNew && styles.statusTextNew,
                      isCollecting && styles.statusTextCollecting,
                      isReady && styles.statusTextReady,
                    ]}>
                      {isNew ? t("orders.status.collectorAssigned") :
                       isCollecting ? t("orders.status.collecting") :
                       t("orders.status.readyForPickup")}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {item.delivery_address}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="cash-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.priceText}>{formatPrice(item.total_uzs)}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Ionicons name="arrow-forward-circle" size={16} color={colors.primary[800]} />
                  <Text style={styles.actionText}>{t("staff.collector.openOrder")}</Text>
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
  refreshBtn: { padding: spacing[2] },
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
  list: { padding: spacing[4], gap: spacing[3] },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing[3],
    ...shadows.sm,
  },
  cardNew: { borderColor: colors.primary[800], borderWidth: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderNumber: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  orderTime: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.hover,
  },
  statusBadgeNew: { backgroundColor: colors.primary[800] + "20" },
  statusBadgeCollecting: { backgroundColor: "#FFF3CD" },
  statusBadgeReady: { backgroundColor: colors.status.success + "20" },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.secondary,
  },
  statusTextNew: { color: colors.primary[800] },
  statusTextCollecting: { color: "#856404" },
  statusTextReady: { color: colors.status.success },
  cardDivider: { height: 1, backgroundColor: colors.surface.border },
  cardFooter: { gap: spacing[2] },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  addressText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
  },
  priceText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.primary[800] + "10",
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[800],
  },
});
