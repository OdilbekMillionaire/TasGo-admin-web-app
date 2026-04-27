import { useState, useRef, useEffect } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { supabase } from "@tasgo/supabase";
import type { UserRole } from "@tasgo/types";

const STAFF_ROLES: UserRole[] = ["collector", "carrier", "cashier"];

export default function StaffOtpScreen() {
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleVerify() {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone ?? "",
        token: otp,
        type: "sms",
      });

      if (error || !data.session) {
        Alert.alert(t("common.error"), t("auth.invalidOtp"));
        return;
      }

      await SecureStore.setItemAsync("tasgo_staff_session", JSON.stringify(data.session));

      // Load profile to get role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user!.id)
        .single();

      if (profileError || !profile) {
        Alert.alert(t("errors.permissionDenied"), "No staff profile found.");
        await supabase.auth.signOut();
        return;
      }

      if (!profile.is_active) {
        Alert.alert(t("errors.permissionDenied"), "Your account has been deactivated.");
        await supabase.auth.signOut();
        return;
      }

      const role = profile.role as UserRole;
      if (!STAFF_ROLES.includes(role)) {
        Alert.alert(t("errors.permissionDenied"), "This app is for staff only.");
        await supabase.auth.signOut();
        return;
      }

      // Route by role
      router.replace(`/${role}` as "/collector" | "/carrier" | "/cashier");
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
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t("auth.enterOtp")}</Text>
        <Text style={styles.subtitle}>{t("auth.otpSentTo", { phone })}</Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={otp}
          onChangeText={(v) => {
            const d = v.replace(/\D/g, "").slice(0, 6);
            setOtp(d);
            if (d.length === 6) void handleVerify();
          }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="------"
          placeholderTextColor={colors.text.tertiary}
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.button, (loading || otp.length < 6) && styles.disabled]}
          onPress={handleVerify}
          disabled={loading || otp.length < 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t("auth.verifyOtp")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (countdown > 0) return;
            void supabase.auth.signInWithOtp({ phone: phone ?? "" });
            setCountdown(60);
            setOtp("");
          }}
          disabled={countdown > 0}
        >
          <Text style={[styles.resend, countdown > 0 && styles.resendDisabled]}>
            {countdown > 0
              ? t("auth.resendOtpIn", { seconds: countdown })
              : t("auth.resendOtp")}
          </Text>
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
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  back: { padding: spacing[2], alignSelf: "flex-start" },
  backText: { fontSize: typography.fontSize["2xl"], color: colors.text.primary },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginTop: spacing[8],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  input: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary[800],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    letterSpacing: 16,
    marginTop: spacing[4],
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
  disabled: { opacity: 0.4 },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  resend: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[800],
    textAlign: "center",
    padding: spacing[3],
  },
  resendDisabled: { color: colors.text.tertiary },
});
