import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import WebView from "react-native-webview";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius } from "@tasgo/ui";
import { useCartStore } from "@/stores/cart";

export default function CheckoutWebViewScreen() {
  const { url, orderId } = useLocalSearchParams<{ url: string; orderId: string }>();
  const { t } = useTranslation();
  const { clearCart } = useCartStore();
  const webViewRef = useRef<WebView>(null);
  const [webLoading, setWebLoading] = useState(true);

  function handleNavigationStateChange(state: { url: string }) {
    // Octo redirects to our return_url on completion
    if (state.url.includes("tasgo://payment/success") || state.url.includes("payment_status=success")) {
      clearCart();
      router.replace({
        pathname: "/orders/[id]",
        params: { id: orderId },
      });
      return;
    }
    if (state.url.includes("tasgo://payment/cancel") || state.url.includes("payment_status=cancel")) {
      router.replace("/(tabs)/cart");
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.replace("/(tabs)/cart");
          }}
          style={styles.backBtn}
        >
          <Ionicons name="close" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("checkout.payment")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {webLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary[800]} size="large" />
          <Text style={styles.loadingText}>{t("checkout.loadingPayment")}</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setWebLoading(true)}
        onLoadEnd={() => setWebLoading(false)}
        startInLoadingState={false}
        javaScriptEnabled
        domStorageEnabled
      />
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
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    zIndex: 10,
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
});
