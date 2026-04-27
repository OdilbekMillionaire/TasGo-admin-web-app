import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { supabase } from "@tasgo/supabase";

export default function RatingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (rating === 0) throw new Error("Select a rating");
      const { error } = await supabase
        .from("orders")
        .update({ rating, rating_comment: comment.trim() || null })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert(t("rating.thankYou"), t("rating.thankYouMessage"), [
        { text: t("common.ok"), onPress: () => router.replace("/(tabs)/orders") },
      ]);
    },
    onError: () => {
      Alert.alert(t("errors.generic"));
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("rating.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={{ fontSize: 64, textAlign: "center" }}>⭐</Text>
        <Text style={styles.question}>{t("rating.question")}</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
              <Ionicons
                name={s <= rating ? "star" : "star-outline"}
                size={44}
                color={s <= rating ? colors.accent[500] : colors.surface.border}
              />
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 && (
          <Text style={styles.ratingHint}>
            {rating === 1 && t("rating.hint1")}
            {rating === 2 && t("rating.hint2")}
            {rating === 3 && t("rating.hint3")}
            {rating === 4 && t("rating.hint4")}
            {rating === 5 && t("rating.hint5")}
          </Text>
        )}

        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder={t("rating.commentPlaceholder")}
          placeholderTextColor={colors.text.tertiary}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        <TouchableOpacity
          style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
          onPress={() => submitMutation.mutate()}
          disabled={rating === 0 || submitMutation.isPending}
          activeOpacity={0.85}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.submitBtnText}>{t("rating.submit")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(tabs)/orders")} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>{t("rating.skip")}</Text>
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
  content: {
    flex: 1,
    padding: spacing[6],
    alignItems: "center",
    gap: spacing[5],
    justifyContent: "center",
  },
  question: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    textAlign: "center",
  },
  starsRow: { flexDirection: "row", gap: spacing[3] },
  ratingHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: "center",
  },
  commentInput: {
    width: "100%",
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    padding: spacing[4],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.primary,
    textAlignVertical: "top",
    minHeight: 100,
    ...shadows.sm,
  },
  submitBtn: {
    width: "100%",
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: "center",
    ...shadows.md,
  },
  submitBtnDisabled: { backgroundColor: colors.surface.border },
  submitBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  skipBtn: { paddingVertical: spacing[2] },
  skipBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.tertiary,
    textDecorationLine: "underline",
  },
});
