import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Switch } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import type { Database } from "@tasgo/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type CarrierProfile = Database["public"]["Tables"]["carrier_profiles"]["Row"];

export default function CarrierHomeScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: carrierProfile } = useQuery<CarrierProfile>({
    queryKey: ["carrier-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("carrier_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const { data: activeOrder } = useQuery<Order | null>({
    queryKey: ["carrier-active-order"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("carrier_id", user.id)
        .in("status", ["carrier_assigned", "in_transit"])
        .order("placed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    refetchInterval: 8000,
  });

  const toggleOnlineMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("carrier_profiles")
        .update({ is_online: isOnline })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["carrier-profile"] });
    },
  });

  const isOnline = carrierProfile?.is_online ?? false;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("staff.carrier.title")}</Text>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineLabel, isOnline && styles.onlineLabelActive]}>
            {isOnline ? t("staff.carrier.online") : t("staff.carrier.offline")}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={(val) => toggleOnlineMutation.mutate(val)}
            trackColor={{ false: colors.surface.border, true: colors.primary[800] }}
            thumbColor="#fff"
            disabled={toggleOnlineMutation.isPending}
          />
        </View>
      </View>

      <View style={styles.content}>
        {/* Status card */}
        <View style={[styles.statusCard, isOnline && styles.statusCardOnline]}>
          <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, isOnline && styles.statusTitleOnline]}>
              {isOnline ? t("staff.carrier.readyForOrders") : t("staff.carrier.goOnlineTip")}
            </Text>
            <Text style={styles.statusSub}>
              {isOnline
                ? t("staff.carrier.onlineDescription")
                : t("staff.carrier.offlineDescription")}
            </Text>
          </View>
        </View>

        {/* Active order */}
        {activeOrder ? (
          <View style={styles.orderSection}>
            <Text style={styles.sectionLabel}>{t("staff.carrier.activeOrder")}</Text>
            <TouchableOpacity
              style={styles.orderCard}
              onPress={() => router.push(`/carrier/order/${activeOrder.id}`)}
              activeOpacity={0.88}
            >
              <View style={styles.orderCardHeader}>
                <View>
                  <Text style={styles.orderNumber}>#{activeOrder.order_number}</Text>
                  <Text style={styles.orderStatus}>
                    {activeOrder.status === "carrier_assigned"
                      ? t("orders.status.carrierAssigned")
                      : t("orders.status.inTransit")}
                  </Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={28} color={colors.primary[800]} />
              </View>
              <View style={styles.orderCardDivider} />
              <View style={styles.orderCardFooter}>
                <View style={styles.orderInfoRow}>
                  <Ionicons name="location-outline" size={14} color={colors.text.tertiary} />
                  <Text style={styles.orderAddress} numberOfLines={2}>
                    {activeOrder.delivery_address}
                  </Text>
                </View>
                <Text style={styles.orderTotal}>{formatPrice(activeOrder.total_uzs)}</Text>
              </View>
              <View style={styles.openOrderRow}>
                <Ionicons name="navigate-outline" size={14} color={colors.primary[800]} />
                <Text style={styles.openOrderText}>{t("staff.carrier.openDelivery")}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : isOnline ? (
          <View style={styles.waitingCard}>
            <ActivityIndicator color={colors.primary[800]} />
            <Text style={styles.waitingText}>{t("staff.carrier.waitingForOrder")}</Text>
          </View>
        ) : null}
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
  onlineToggle: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  onlineLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  onlineLabelActive: { color: colors.primary[800] },
  content: { flex: 1, padding: spacing[4], gap: spacing[4] },
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    ...shadows.sm,
  },
  statusCardOnline: { borderColor: colors.primary[800] },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text.tertiary,
    marginTop: 4,
    flexShrink: 0,
  },
  statusDotOnline: { backgroundColor: colors.status.success },
  statusInfo: { flex: 1, gap: spacing[1] },
  statusTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.secondary,
  },
  statusTitleOnline: { color: colors.primary[800] },
  statusSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  orderSection: { gap: spacing[3] },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orderCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 2,
    borderColor: colors.primary[800],
    gap: spacing[3],
    ...shadows.md,
  },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNumber: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  orderStatus: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[800],
    marginTop: 2,
  },
  orderCardDivider: { height: 1, backgroundColor: colors.surface.border },
  orderCardFooter: { gap: spacing[2] },
  orderInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2] },
  orderAddress: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  orderTotal: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  openOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  openOrderText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: "#fff",
  },
  waitingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  waitingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
});
