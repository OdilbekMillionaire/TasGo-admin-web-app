import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "@tasgo/i18n";
import { initI18n, SUPPORTED_LOCALES } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { supabase } from "@tasgo/supabase";
import type { Database } from "@tasgo/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ClientProfile = Database["public"]["Tables"]["client_profiles"]["Row"];

const LOCALE_NAMES: Record<string, string> = {
  "uz-latn": "O'zbekcha (lotin)",
  "uz-cyrl": "Ўзбекча (кирил)",
  ru: "Русский",
  en: "English",
};

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

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
  });

  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      setEditingName(false);
    },
    onError: () => {
      Alert.alert(t("errors.generic"));
    },
  });

  async function handleLanguageChange(locale: string) {
    await AsyncStorage.setItem("tasgo_language", locale);
    await initI18n(locale);
    setShowLangPicker(false);
  }

  async function handleLogout() {
    Alert.alert(t("profile.logoutConfirmTitle"), t("profile.logoutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/phone");
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary[800]} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const currentLang = i18n.language as string;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (nameInput.trim()) updateNameMutation.mutate(nameInput.trim());
                }}
              />
              <TouchableOpacity
                style={styles.nameEditBtn}
                onPress={() => {
                  if (nameInput.trim()) updateNameMutation.mutate(nameInput.trim());
                }}
                disabled={updateNameMutation.isPending}
              >
                {updateNameMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Ionicons name="checkmark" size={18} color={colors.text.inverse} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nameEditBtn, styles.nameEditBtnCancel]}
                onPress={() => setEditingName(false)}
              >
                <Ionicons name="close" size={18} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => {
                setNameInput(profile?.full_name ?? "");
                setEditingName(true);
              }}
            >
              <Text style={styles.name}>{profile?.full_name ?? t("profile.noName")}</Text>
              <Ionicons name="pencil-outline" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
          <Text style={styles.phone}>{profile?.phone}</Text>
        </View>

        {/* Info section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.info")}</Text>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={colors.text.secondary} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{t("auth.phoneNumber")}</Text>
                <Text style={styles.infoValue}>{profile?.phone ?? "—"}</Text>
              </View>
            </View>

            {clientProfile?.default_address && (
              <>
                <View style={styles.separator} />
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color={colors.text.secondary} />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>{t("checkout.deliveryAddress")}</Text>
                    <Text style={styles.infoValue}>{clientProfile.default_address}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Language section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => setShowLangPicker(!showLangPicker)}
            >
              <Ionicons name="language-outline" size={18} color={colors.text.secondary} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{t("profile.language")}</Text>
                <Text style={styles.infoValue}>{LOCALE_NAMES[currentLang] ?? currentLang}</Text>
              </View>
              <Ionicons
                name={showLangPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>

            {showLangPicker && (
              <>
                <View style={styles.separator} />
                {SUPPORTED_LOCALES.map((locale) => (
                  <TouchableOpacity
                    key={locale}
                    style={styles.langOption}
                    onPress={() => handleLanguageChange(locale)}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        locale === currentLang && styles.langOptionActive,
                      ]}
                    >
                      {LOCALE_NAMES[locale]}
                    </Text>
                    {locale === currentLang && (
                      <Ionicons name="checkmark" size={16} color={colors.primary[800]} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Actions section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => router.push("/(tabs)/orders")}
            >
              <Ionicons name="receipt-outline" size={18} color={colors.text.secondary} />
              <View style={styles.infoText}>
                <Text style={styles.actionLabel}>{t("orders.title")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={[styles.section, { marginBottom: spacing[8] }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.status.error} />
            <Text style={styles.logoutText}>{t("profile.logout")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  scroll: { padding: spacing[4], gap: spacing[4] },
  avatarSection: { alignItems: "center", paddingVertical: spacing[6], gap: spacing[3] },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[800],
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  avatarInitial: {
    fontSize: 32,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  name: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  phone: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  nameInput: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[800],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  nameEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[800],
    alignItems: "center",
    justifyContent: "center",
  },
  nameEditBtnCancel: { backgroundColor: colors.surface.border },
  section: { gap: spacing[2] },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing[1],
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  separator: { height: 1, backgroundColor: colors.surface.border, marginHorizontal: spacing[4] },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  langOptionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  langOptionActive: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[800],
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: colors.status.error + "40",
    ...shadows.sm,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.status.error,
  },
});
