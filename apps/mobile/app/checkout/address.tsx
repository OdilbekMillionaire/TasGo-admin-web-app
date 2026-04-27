import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Circle, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import {
  isInsideDeliveryZone,
  DELIVERY_ZONE_CENTER_LAT,
  DELIVERY_ZONE_CENTER_LNG,
  DELIVERY_ZONE_RADIUS_KM,
} from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import type { Database } from "@tasgo/types";

type ClientProfile = Database["public"]["Tables"]["client_profiles"]["Row"];

export default function CheckoutAddressScreen() {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>({
    latitude: DELIVERY_ZONE_CENTER_LAT,
    longitude: DELIVERY_ZONE_CENTER_LNG,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  });
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [addressLabel, setAddressLabel] = useState("");
  const [isInZone, setIsInZone] = useState(true);

  const { data: clientProfile } = useQuery<ClientProfile>({
    queryKey: ["client-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (profile) => {
      if (profile.default_address_lat && profile.default_address_lng) {
        setSelectedLat(profile.default_address_lat);
        setSelectedLng(profile.default_address_lng);
        setAddressLabel(profile.default_address ?? "");
        setRegion((r) => ({
          ...r,
          latitude: profile.default_address_lat!,
          longitude: profile.default_address_lng!,
        }));
        const inZone = isInsideDeliveryZone(
          profile.default_address_lat,
          profile.default_address_lng,
          DELIVERY_ZONE_CENTER_LAT,
          DELIVERY_ZONE_CENTER_LNG,
          DELIVERY_ZONE_RADIUS_KM
        );
        setIsInZone(inZone);
      }
    },
  } as Parameters<typeof useQuery>[0]);

  function handleMapPress(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLat(latitude);
    setSelectedLng(longitude);
    const inZone = isInsideDeliveryZone(
      latitude, longitude,
      DELIVERY_ZONE_CENTER_LAT,
      DELIVERY_ZONE_CENTER_LNG,
      DELIVERY_ZONE_RADIUS_KM
    );
    setIsInZone(inZone);
  }

  function handleContinue() {
    if (!selectedLat || !selectedLng) {
      Alert.alert(t("checkout.selectAddressFirst"));
      return;
    }
    if (!isInZone) {
      Alert.alert(t("checkout.outsideZoneTitle"), t("checkout.outsideZoneMessage"));
      return;
    }
    const address = addressLabel.trim() || `${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;
    router.push({
      pathname: "/checkout/payment",
      params: {
        lat: selectedLat.toString(),
        lng: selectedLng.toString(),
        address,
      },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("checkout.deliveryAddress")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? "google" : PROVIDER_DEFAULT}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
      >
        {/* Delivery zone circle */}
        <Circle
          center={{ latitude: DELIVERY_ZONE_CENTER_LAT, longitude: DELIVERY_ZONE_CENTER_LNG }}
          radius={DELIVERY_ZONE_RADIUS_KM * 1000}
          fillColor={colors.primary[800] + "18"}
          strokeColor={colors.primary[800] + "80"}
          strokeWidth={2}
        />

        {/* Selected pin */}
        {selectedLat && selectedLng && (
          <Marker coordinate={{ latitude: selectedLat, longitude: selectedLng }}>
            <View style={[styles.pin, !isInZone && styles.pinOutside]}>
              <Ionicons name="location" size={22} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Bottom panel */}
      <View style={styles.panel}>
        {!isInZone && selectedLat && (
          <View style={styles.zoneWarning}>
            <Ionicons name="warning-outline" size={16} color={colors.status.error} />
            <Text style={styles.zoneWarningText}>{t("checkout.outsideZone")}</Text>
          </View>
        )}

        <Text style={styles.panelLabel}>{t("checkout.addressLabel")}</Text>
        <TextInput
          style={styles.addressInput}
          value={addressLabel}
          onChangeText={setAddressLabel}
          placeholder={t("checkout.addressPlaceholder")}
          placeholderTextColor={colors.text.tertiary}
          returnKeyType="done"
        />

        <Text style={styles.mapHint}>{t("checkout.tapMapToPin")}</Text>

        <TouchableOpacity
          style={[
            styles.continueBtn,
            (!selectedLat || !isInZone) && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedLat || !isInZone}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>{t("checkout.continue")}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
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
  map: { flex: 1 },
  pin: {
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
  pinOutside: { backgroundColor: colors.status.error },
  panel: {
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    padding: spacing[5],
    gap: spacing[3],
  },
  zoneWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.status.error + "15",
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  zoneWarningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.status.error,
  },
  panelLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.secondary,
  },
  addressInput: {
    backgroundColor: colors.surface.bg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.primary,
  },
  mapHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  continueBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    ...shadows.md,
  },
  continueBtnDisabled: { backgroundColor: colors.surface.border },
  continueBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
});
