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

export default function OtpScreen() {
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  async function handleVerify() {
    if (otp.length !== 6) {
      Alert.alert(t("common.error"), t("auth.invalidOtp"));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone ?? "",
        token: otp,
        type: "sms",
      });

      if (error || !data.session) {
        Alert.alert(
          t("common.error"),
          error?.message === "Token has expired or is invalid"
            ? t("auth.otpExpired")
            : t("auth.invalidOtp")
        );
        return;
      }

      // Persist session
      await SecureStore.setItemAsync("tasgo_session", JSON.stringify(data.session));

      // Check if profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", data.user!.id)
        .single();

      if (!profile) {
        // New user — go to profile setup
        router.replace({ pathname: "/(auth)/setup", params: { phone } });
      } else {
        // Existing client — go to main app
        router.replace("/(tabs)");
      }
    } catch {
      Alert.alert(t("common.error"), t("errors.networkError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    try {
      await supabase.auth.signInWithOtp({ phone: phone ?? "" });
      setResendCountdown(60);
      setOtp("");
    } catch {
      Alert.alert(t("common.error"), t("errors.networkError"));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{t("auth.enterOtp")}</Text>
          <Text style={styles.subtitle}>
            {t("auth.otpSentTo", { phone: phone ?? "" })}
          </Text>
        </View>

        <View style={styles.otpContainer}>
          <TextInput
            ref={inputRef}
            style={styles.otpInput}
            value={otp}
            onChangeText={(v) => {
              const digits = v.replace(/\D/g, "").slice(0, 6);
              setOtp(digits);
              if (digits.length === 6) void handleVerify();
            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="------"
            placeholderTextColor={colors.text.tertiary}
            textAlign="center"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || otp.length !== 6}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>{t("auth.verifyOtp")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResend}
          disabled={resendCountdown > 0}
        >
          <Text
            style={[
              styles.resendText,
              resendCountdown > 0 && styles.resendDisabled,
            ]}
          >
            {resendCountdown > 0
              ? t("auth.resendOtpIn", { seconds: resendCountdown })
              : t("auth.resendOtp")}
          </Text>
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
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  backButton: {
    position: "absolute",
    top: spacing[16],
    left: spacing[6],
    padding: spacing[2],
  },
  backText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.text.primary,
  },
  header: {
    marginTop: spacing[10],
    marginBottom: spacing[10],
    gap: spacing[2],
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
  otpContainer: {
    marginBottom: spacing[8],
  },
  otpInput: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary[800],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    letterSpacing: 16,
    ...shadows.sm,
  },
  button: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    marginBottom: spacing[4],
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  resendButton: {
    alignItems: "center",
    padding: spacing[3],
  },
  resendText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[800],
  },
  resendDisabled: {
    color: colors.text.tertiary,
  },
});
