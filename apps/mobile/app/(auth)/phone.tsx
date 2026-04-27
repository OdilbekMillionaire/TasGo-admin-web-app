import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { supabase } from "@tasgo/supabase";

export default function PhoneScreen() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("+998 ");
  const [loading, setLoading] = useState(false);

  function formatPhoneDisplay(raw: string): string {
    const digits = raw.replace(/\D/g, "").replace(/^998/, "");
    if (digits.length === 0) return "+998 ";
    if (digits.length <= 2) return `+998 ${digits}`;
    if (digits.length <= 5) return `+998 ${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }

  function getRawPhone(display: string): string {
    const digits = display.replace(/\D/g, "");
    return `+${digits}`;
  }

  async function handleDevPreview() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.user) {
        Alert.alert(
          "Dev Preview",
          `Anonymous auth failed: ${error?.message ?? "no user"}\n\nIn Supabase dashboard → Auth → Providers → enable Anonymous.`
        );
        return;
      }
      // Generate a fake unique phone so profiles.phone NOT NULL is satisfied
      const digits = data.user.id.replace(/[^0-9]/g, "").slice(0, 7).padEnd(7, "0");
      const fakePhone = `+99800${digits}`;
      await supabase.from("profiles").upsert(
        { id: data.user.id, role: "client", full_name: "Preview User", phone: fakePhone, is_active: true },
        { onConflict: "id" }
      );
      await supabase.from("client_profiles").upsert({ id: data.user.id }, { onConflict: "id" });
      router.replace("/(tabs)");
    } catch (e: unknown) {
      Alert.alert("Error", String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    const rawPhone = getRawPhone(phone);
    if (!/^\+998\d{9}$/.test(rawPhone)) {
      Alert.alert(t("common.error"), t("auth.phoneInvalid"));
      return;
    }

    setLoading(true);
    try {
      // Use Supabase Auth phone OTP (integrates with Eskiz via custom Edge Function)
      const { error } = await supabase.auth.signInWithOtp({
        phone: rawPhone,
      });

      if (error) {
        Alert.alert(t("common.error"), error.message);
        return;
      }

      router.push({ pathname: "/(auth)/otp", params: { phone: rawPhone } });
    } catch {
      Alert.alert(t("common.error"), t("errors.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>TG</Text>
          </View>
          <Text style={styles.title}>{t("auth.welcome")}</Text>
          <Text style={styles.subtitle}>{t("auth.welcomeSubtitle")}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t("auth.phoneNumber")}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(v) => setPhone(formatPhoneDisplay(v))}
            keyboardType="phone-pad"
            placeholder={t("auth.phoneNumberPlaceholder")}
            placeholderTextColor={colors.text.tertiary}
            maxLength={17}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSendOtp}
          />
          <Text style={styles.hint}>{t("auth.phoneNumberHint")}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>{t("auth.sendOtp")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.devButton}
          onPress={handleDevPreview}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.devButtonText}>⚡ Preview mode (skip SMS)</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.bg,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[20],
    paddingBottom: spacing[8],
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    gap: spacing[3],
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[800],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[2],
  },
  logoText: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    textAlign: "center",
  },
  form: {
    gap: spacing[2],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  input: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    ...shadows.sm,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  button: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  devButton: {
    alignItems: "center",
    marginTop: spacing[3],
    padding: spacing[3],
  },
  devButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.tertiary,
  },
});
