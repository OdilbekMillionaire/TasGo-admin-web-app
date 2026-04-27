import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice, CARRIER_LOCATION_TASK_NAME } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import type { Database } from "@tasgo/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

// Background location task definition (must be at module top level)
TaskManager.defineTask(CARRIER_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Location task error:", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const loc = locations[0];
    if (loc) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("carrier_profiles")
          .update({
            current_lat: loc.coords.latitude,
            current_lng: loc.coords.longitude,
            last_location_update: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
    }
  }
});

const STEPS = ["navigate_to_store", "pickup", "navigate_to_client", "deliver"] as const;
type Step = typeof STEPS[number];

const STORE_LAT = parseFloat(process.env.EXPO_PUBLIC_DELIVERY_ZONE_CENTER_LAT ?? "41.2995");
const STORE_LNG = parseFloat(process.env.EXPO_PUBLIC_DELIVERY_ZONE_CENTER_LNG ?? "69.2401");

export default function CarrierOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: order } = useQuery<Order>({
    queryKey: ["carrier-order", id],
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

  const currentStep: Step =
    order?.status === "carrier_assigned" ? "navigate_to_store" :
    order?.status === "in_transit" ? "navigate_to_client" :
    "navigate_to_store";

  // Start background location when screen mounts (rule §8 — only while order active)
  useEffect(() => {
    async function startLocationTask() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== "granted") return;

      setLocationPermission(true);

      const isRunning = await Location.hasStartedLocationUpdatesAsync(CARRIER_LOCATION_TASK_NAME);
      if (!isRunning) {
        await Location.startLocationUpdatesAsync(CARRIER_LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
          foregroundService: {
            notificationTitle: "TasGo Kuryer",
            notificationBody: "Joylashuv yangilanmoqda...",
          },
        });
      }
    }

    void startLocationTask();

    // Stop on unmount (will also stop on delivery confirmation below)
    return () => {
      Location.hasStartedLocationUpdatesAsync(CARRIER_LOCATION_TASK_NAME).then((running) => {
        if (running) void Location.stopLocationUpdatesAsync(CARRIER_LOCATION_TASK_NAME);
      });
    };
  }, []);

  async function stopLocationTracking() {
    // Rule §8: stop immediately on delivery confirmation
    const isRunning = await Location.hasStartedLocationUpdatesAsync(CARRIER_LOCATION_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(CARRIER_LOCATION_TASK_NAME);
    }
  }

  async function handlePickedUp() {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "in_transit" })
        .eq("id", id);
      if (error) throw error;

      await supabase.functions.invoke("send-push", {
        body: {
          userId: order?.client_id,
          event: "carrier_assigned",
          data: { orderNumber: order?.order_number },
        },
      });

      void qc.invalidateQueries({ queryKey: ["carrier-order", id] });
      void qc.invalidateQueries({ queryKey: ["carrier-active-order"] });
    } catch (err) {
      Alert.alert(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelivered() {
    Alert.alert(t("staff.carrier.confirmDelivery"), t("staff.carrier.confirmDeliveryMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("staff.carrier.confirm"),
        onPress: async () => {
          setSubmitting(true);
          try {
            // Stop location tracking immediately (rule §8)
            await stopLocationTracking();

            const { error } = await supabase
              .from("orders")
              .update({
                status: "delivered",
                delivered_at: new Date().toISOString(),
              })
              .eq("id", id);
            if (error) throw error;

            await supabase.functions.invoke("send-push", {
              body: {
                userId: order?.client_id,
                event: "delivered",
                data: { orderNumber: order?.order_number },
              },
            });

            void qc.invalidateQueries({ queryKey: ["carrier-active-order"] });
            Alert.alert(t("staff.carrier.deliveryConfirmed"), "", [
              { text: t("common.ok"), onPress: () => router.replace("/carrier") },
            ]);
          } catch (err) {
            Alert.alert(t("errors.generic"));
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }

  const destLat = currentStep === "navigate_to_store" ? STORE_LAT : (order?.delivery_lat ?? STORE_LAT);
  const destLng = currentStep === "navigate_to_store" ? STORE_LNG : (order?.delivery_lng ?? STORE_LNG);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>#{order?.order_number ?? "..."}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.steps}>
        {STEPS.map((step, index) => {
          const stepIndex = STEPS.indexOf(currentStep);
          const isCompleted = index < stepIndex;
          const isCurrent = index === stepIndex;
          return (
            <View key={step} style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                isCompleted && styles.stepDotCompleted,
                isCurrent && styles.stepDotCurrent,
              ]}>
                {isCompleted && <Ionicons name="checkmark" size={10} color="#fff" />}
              </View>
              {index < STEPS.length - 1 && (
                <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? "google" : PROVIDER_DEFAULT}
        initialRegion={{
          latitude: destLat,
          longitude: destLng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        <Marker
          coordinate={{ latitude: destLat, longitude: destLng }}
          title={currentStep === "navigate_to_store" ? t("tracking.store") : t("tracking.destination")}
        >
          <View style={[styles.destPin, currentStep !== "navigate_to_store" && styles.destPinClient]}>
            <Ionicons
              name={currentStep === "navigate_to_store" ? "business" : "home"}
              size={18}
              color="#fff"
            />
          </View>
        </Marker>
      </MapView>

      {/* Action card */}
      <View style={styles.actionCard}>
        <View style={styles.actionInfo}>
          <Text style={styles.actionStepLabel}>
            {currentStep === "navigate_to_store" && t("staff.carrier.step1")}
            {currentStep === "pickup" && t("staff.carrier.step2")}
            {currentStep === "navigate_to_client" && t("staff.carrier.step3")}
            {currentStep === "deliver" && t("staff.carrier.step4")}
          </Text>
          <Text style={styles.actionAddressText} numberOfLines={2}>
            {currentStep === "navigate_to_store" || currentStep === "pickup"
              ? t("staff.carrier.storeAddress")
              : order?.delivery_address ?? ""}
          </Text>
        </View>

        {order && (
          <View style={styles.orderSummary}>
            <Text style={styles.orderSummaryLabel}>{t("cart.total")}</Text>
            <Text style={styles.orderSummaryValue}>{formatPrice(order.total_uzs)}</Text>
          </View>
        )}

        {currentStep === "navigate_to_store" && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handlePickedUp}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.inverse} />
                <Text style={styles.actionBtnText}>{t("staff.carrier.pickedUp")}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {currentStep === "navigate_to_client" && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDelivery]}
            onPress={handleDelivered}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Ionicons name="checkmark-done-circle-outline" size={20} color={colors.text.inverse} />
                <Text style={styles.actionBtnText}>{t("staff.carrier.confirmDelivery")}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
  steps: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  stepItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface.border,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface.border,
  },
  stepDotCompleted: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  stepDotCurrent: { backgroundColor: colors.accent[500], borderColor: colors.accent[500] },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.surface.border },
  stepLineCompleted: { backgroundColor: colors.primary[800] },
  map: { flex: 1 },
  destPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[800],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    ...shadows.md,
  },
  destPinClient: { backgroundColor: colors.accent[500] },
  actionCard: {
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    padding: spacing[5],
    gap: spacing[3],
  },
  actionInfo: { gap: spacing[1] },
  actionStepLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionAddressText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  orderSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  orderSummaryLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  orderSummaryValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    ...shadows.md,
  },
  actionBtnDelivery: { backgroundColor: colors.status.success },
  actionBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
});
