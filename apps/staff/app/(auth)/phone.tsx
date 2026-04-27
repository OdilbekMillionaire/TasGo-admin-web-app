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

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^998/, "");
  if (!digits) return "+998 ";
  if (digits.length <= 2) return `+998 ${digits}`;
  if (digits.length <= 5) return `+998 ${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 7) return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

export default function StaffPhoneScreen() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("+998 ");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    const raw = `+${phone.replace(/\D/g, "")}`;
    if (!/^\+998\d{9}$/.test(raw)) {
      Alert.alert(t("common.error"), t("auth.phoneInvalid"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: raw });
      if (error) {
        Alert.alert(t("common.error"), error.message);
        return;
      }
      router.push({ pathname: "/(auth)/otp", params: { phone: raw } });
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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>STAFF</Text>
          </View>
          <Text style={styles.title}>{t("auth.staffLoginTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.staffLoginSubtitle")}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t("auth.phoneNumber")}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(v) => setPhone(formatPhone(v))}
            keyboardType="phone-pad"
            placeholder="+998 XX XXX XX XX"
            placeholderTextColor={colors.text.tertiary}
            maxLength={17}
            autoFocus
          />
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
  inner: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[20],
    paddingBottom: spacing[8],
    justifyContent: "space-between",
  },
  header: { alignItems: "center", gap: spacing[3] },
  badge: {
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginBottom: spacing[2],
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
    letterSpacing: 2,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  form: { gap: spacing[2] },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
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
  button: {
    backgroundColor: colors.primary[900],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: "center",
    minHeight: 56,
    ...shadows.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
});
