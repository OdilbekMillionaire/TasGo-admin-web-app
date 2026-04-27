import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius } from "@tasgo/ui";
import { supabase } from "@tasgo/supabase";
import type { Database } from "@tasgo/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type CarrierProfile = Database["public"]["Tables"]["carrier_profiles"]["Row"];

export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);

  const { data: order } = useQuery<Order>({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
    refetchInterval: 5000,
  });

  const { data: carrier } = useQuery<CarrierProfile | null>({
    queryKey: ["carrier-location", order?.carrier_id],
    queryFn: async () => {
      if (!order?.carrier_id) return null;
      const { data, error } = await supabase
        .from("carrier_profiles")
        .select("*")
        .eq("id", order.carrier_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!order?.carrier_id && order?.status === "in_transit",
    refetchInterval: 5000,
  });

  // Real-time subscription for carrier location
  useEffect(() => {
    if (!order?.carrier_id) return;

    const channel = supabase
      .channel(`carrier-location-${order.carrier_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "carrier_profiles",
          filter: `id=eq.${order.carrier_id}`,
        },
        (payload) => {
          const updated = payload.new as CarrierProfile;
          if (updated.current_lat && updated.current_lng && mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude: updated.current_lat,
                longitude: updated.current_lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              },
              500
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [order?.carrier_id]);

  const deliveryLat = order?.delivery_lat ?? 41.2995;
  const deliveryLng = order?.delivery_lng ?? 69.2401;
  const carrierLat = carrier?.current_lat;
  const carrierLng = carrier?.current_lng;

  const initialRegion = {
    latitude: carrierLat ?? deliveryLat,
    longitude: carrierLng ?? deliveryLng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("orders.trackOrder")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? "google" : PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Delivery destination */}
        <Marker
          coordinate={{ latitude: deliveryLat, longitude: deliveryLng }}
          title={t("tracking.destination")}
        >
          <View style={styles.destMarker}>
            <Ionicons name="home" size={18} color="#fff" />
          </View>
        </Marker>

        {/* Carrier pin */}
        {carrierLat && carrierLng && (
          <Marker
            coordinate={{ latitude: carrierLat, longitude: carrierLng }}
            title={t("tracking.carrier")}
          >
            <View style={styles.carrierMarker}>
              <Ionicons name="bicycle" size={18} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Delivery zone circle */}
        <Circle
          center={{ latitude: deliveryLat, longitude: deliveryLng }}
          radius={80}
          fillColor={colors.primary[800] + "20"}
          strokeColor={colors.primary[800] + "60"}
          strokeWidth={2}
        />
      </MapView>

      {/* Bottom status card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{t("orders.status.inTransit")}</Text>
        </View>
        {carrierLat && carrierLng ? (
          <Text style={styles.statusSub}>{t("tracking.carrierOnWay")}</Text>
        ) : (
          <Text style={styles.statusSub}>{t("tracking.locatingCarrier")}</Text>
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
  map: { flex: 1 },
  destMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[800],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  carrierMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent[500],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  statusCard: {
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    padding: spacing[5],
    gap: spacing[2],
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent[500],
  },
  statusText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  statusSub: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
});
