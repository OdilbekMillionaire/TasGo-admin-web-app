import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initI18n, SUPPORTED_LOCALES } from "@tasgo/i18n";
import type { SupportedLocale } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius } from "@tasgo/ui";
import { useTranslation } from "@tasgo/i18n";

const LOCALE_DISPLAY: Record<SupportedLocale, string> = {
  "uz-latn": "O'zbek (lotin)",
  "uz-cyrl": "Ўзбек (кирил)",
  ru: "Русский",
  en: "English",
};

const LOCALE_NATIVE: Record<SupportedLocale, string> = {
  "uz-latn": "Til tanlang",
  "uz-cyrl": "Тилни танланг",
  ru: "Выберите язык",
  en: "Select language",
};

export default function LanguageScreen() {
  const { t } = useTranslation();

  async function selectLanguage(locale: SupportedLocale) {
    await AsyncStorage.setItem("tasgo_language", locale);
    initI18n(locale);
    router.replace("/(auth)/phone");
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>TG</Text>
        </View>
        <Text style={styles.brandName}>TasGo</Text>
        <Text style={styles.tagline}>Til tanlang · Выберите язык</Text>
      </View>

      <View style={styles.localeList}>
        {SUPPORTED_LOCALES.map((locale) => (
          <TouchableOpacity
            key={locale}
            style={styles.localeButton}
            onPress={() => selectLanguage(locale)}
            activeOpacity={0.7}
          >
            <Text style={styles.localeLabel}>{LOCALE_DISPLAY[locale]}</Text>
            <Text style={styles.localeNative}>{LOCALE_NATIVE[locale]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.bg,
    paddingHorizontal: spacing[6],
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing[12],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[800],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  logoText: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  brandName: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    textAlign: "center",
  },
  localeList: {
    gap: spacing[3],
  },
  localeButton: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  localeLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  localeNative: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
});
