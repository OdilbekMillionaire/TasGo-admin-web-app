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
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { supabase } from "@tasgo/supabase";

export default function SetupScreen() {
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    if (!fullName.trim()) {
      Alert.alert(t("common.error"), t("auth.nameRequired"));
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create profile record
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        role: "client" as const,
        full_name: fullName.trim(),
        phone: phone ?? user.phone ?? "",
      });

      if (error) {
        Alert.alert(t("common.error"), error.message);
        return;
      }

      router.replace("/(tabs)");
    } catch {
      Alert.alert(t("common.error"), t("errors.serverError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>👋</Text>
          </View>
          <Text style={styles.title}>{t("auth.setupProfile")}</Text>
          <Text style={styles.subtitle}>{phone}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.fullName")}</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t("auth.fullNamePlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleComplete}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, (!fullName.trim() || loading) && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={!fullName.trim() || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>{t("auth.completeSetup")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.bg,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[20],
    paddingBottom: spacing[8],
    gap: spacing[8],
  },
  header: {
    alignItems: "center",
    gap: spacing[3],
  },
  emojiContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[2],
  },
  emoji: {
    fontSize: 36,
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
  },
  form: {
    gap: spacing[5],
  },
  field: {
    gap: spacing[2],
  },
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
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.primary,
    ...shadows.sm,
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
    opacity: 0.4,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
});
