import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Vibration,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { supabase } from "@tasgo/supabase";
import type { Database } from "@tasgo/types";

type OrderItem = Database["public"]["Tables"]["order_items"]["Row"] & {
  products: { barcode: string | null } | null;
};

export default function CollectorOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const lastScannedRef = useRef<string>("");

  const { data: order } = useQuery({
    queryKey: ["collector-order", id],
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
  });

  const { data: items = [], isLoading } = useQuery<OrderItem[]>({
    queryKey: ["collector-order-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*, products(barcode)")
        .eq("order_id", id);
      if (error) throw error;
      return (data ?? []) as OrderItem[];
    },
    enabled: !!id,
  });

  // Mark collecting when opened
  useEffect(() => {
    if (order?.status === "collector_assigned") {
      void supabase
        .from("orders")
        .update({ status: "collecting" })
        .eq("id", id);
    }
  }, [order?.status, id]);

  function handleBarcodeScan({ data: barcode }: { data: string }) {
    if (barcode === lastScannedRef.current) return;
    lastScannedRef.current = barcode;

    // Find matching item by barcode
    const matchingItem = items.find((item) => item.products?.barcode === barcode);
    if (!matchingItem) {
      Vibration.vibrate([0, 100, 50, 100]);
      Alert.alert(t("staff.collector.barcodeNotFound"), barcode);
      setTimeout(() => { lastScannedRef.current = ""; }, 2000);
      return;
    }

    if (scannedItems.has(matchingItem.product_id)) {
      Alert.alert(t("staff.collector.alreadyScanned"));
      setTimeout(() => { lastScannedRef.current = ""; }, 1000);
      return;
    }

    Vibration.vibrate(50);
    setScannedItems((prev) => new Set([...prev, matchingItem.product_id]));
    setTimeout(() => { lastScannedRef.current = ""; }, 1000);
  }

  async function handleMarkReady() {
    const unscanned = items.filter((i) => !scannedItems.has(i.product_id));
    if (unscanned.length > 0) {
      Alert.alert(
        t("staff.collector.itemsRemaining"),
        t("staff.collector.itemsRemainingMessage", { count: unscanned.length }),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("staff.collector.markReadyAnyway"), onPress: () => void submitReady() },
        ]
      );
      return;
    }
    void submitReady();
  }

  async function submitReady() {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert inventory_log entries for scanned items (rule §6 — all stock via inventory_log)
      const inventoryEntries = items
        .filter((item) => scannedItems.has(item.product_id))
        .map((item) => ({
          product_id: item.product_id,
          action: "order_reserved" as const,
          quantity_change: -item.quantity,
          performed_by: user.id,
          order_id: id,
        }));

      if (inventoryEntries.length > 0) {
        const { error: invError } = await supabase
          .from("inventory_log")
          .insert(inventoryEntries);
        if (invError) throw new Error(invError.message);
      }

      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "ready_for_pickup",
          collected_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (orderError) throw new Error(orderError.message);

      // Trigger carrier assignment
      await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/assign-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ orderId: id, assignRole: "carrier" }),
      });

      // Notify client
      await supabase.functions.invoke("send-push", {
        body: {
          userId: order?.client_id,
          event: "ready_for_pickup",
          data: { orderNumber: order?.order_number },
        },
      });

      void qc.invalidateQueries({ queryKey: ["collector-orders"] });
      Alert.alert(t("staff.collector.markedReady"), "", [
        { text: t("common.ok"), onPress: () => router.replace("/collector") },
      ]);
    } catch (err) {
      Alert.alert(t("errors.generic"), err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  const allScanned = items.length > 0 && items.every((i) => scannedItems.has(i.product_id));
  const scannedCount = scannedItems.size;
  const totalCount = items.length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>#{order?.order_number ?? "..."}</Text>
        <Text style={styles.progress}>{scannedCount}/{totalCount}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: totalCount > 0 ? `${(scannedCount / totalCount) * 100}%` : "0%" as `${number}%` },
          ]}
        />
      </View>

      {/* Scanner */}
      {scanning && (
        <View style={styles.scannerContainer}>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={handleBarcodeScan}
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "code128", "code39", "qr"] }}
            />
          ) : (
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionText}>{t("staff.collector.grantCamera")}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeScannerBtn} onPress={() => setScanning(false)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Items list */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[800]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isScanned = scannedItems.has(item.product_id);
            return (
              <TouchableOpacity
                style={[styles.itemCard, isScanned && styles.itemCardScanned]}
                onPress={() => {
                  if (!isScanned) {
                    setScannedItems((prev) => new Set([...prev, item.product_id]));
                  }
                }}
                activeOpacity={0.88}
              >
                <View style={[styles.checkCircle, isScanned && styles.checkCircleActive]}>
                  {isScanned && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, isScanned && styles.itemNameScanned]} numberOfLines={2}>
                    {item.product_name_snapshot}
                  </Text>
                  <View style={styles.itemMeta}>
                    {item.products?.barcode && (
                      <Text style={styles.itemBarcode}>{item.products.barcode}</Text>
                    )}
                    <Text style={styles.itemQty}>× {item.quantity}</Text>
                  </View>
                </View>
                {isScanned && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.status.success} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Bottom actions */}
      <View style={styles.footer}>
        {!scanning && (
          <TouchableOpacity style={styles.scanBtn} onPress={() => setScanning(true)}>
            <Ionicons name="barcode-outline" size={20} color={colors.primary[800]} />
            <Text style={styles.scanBtnText}>{t("staff.collector.scanBarcode")}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.readyBtn, !allScanned && styles.readyBtnPartial]}
          onPress={handleMarkReady}
          disabled={submitting || items.length === 0}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Text style={styles.readyBtnText}>{t("staff.collector.markReady")}</Text>
              {!allScanned && (
                <Text style={styles.readyBtnSub}>
                  {scannedCount}/{totalCount} {t("staff.collector.scanned")}
                </Text>
              )}
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
  progress: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[800],
    minWidth: 40,
    textAlign: "right",
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface.border,
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary[800],
  },
  scannerContainer: {
    height: 250,
    position: "relative",
    backgroundColor: "#000",
  },
  camera: { flex: 1 },
  closeScannerBtn: {
    position: "absolute",
    bottom: spacing[3],
    alignSelf: "center",
  },
  permissionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionText: {
    color: "#fff",
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing[4], gap: spacing[2] },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.surface.border,
    gap: spacing[3],
    ...shadows.sm,
  },
  itemCardScanned: {
    backgroundColor: colors.status.success + "08",
    borderColor: colors.status.success + "40",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surface.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkCircleActive: {
    backgroundColor: colors.status.success,
    borderColor: colors.status.success,
  },
  itemInfo: { flex: 1, gap: 2 },
  itemName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  itemNameScanned: { color: colors.text.secondary, textDecorationLine: "line-through" },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  itemBarcode: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
  },
  itemQty: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[800],
  },
  footer: {
    padding: spacing[4],
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    gap: spacing[3],
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.primary[800] + "15",
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.primary[800] + "40",
  },
  scanBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[800],
  },
  readyBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: "center",
    ...shadows.md,
  },
  readyBtnPartial: { backgroundColor: colors.accent[500] },
  readyBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  readyBtnSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.inverse,
    opacity: 0.8,
    marginTop: 2,
  },
});
