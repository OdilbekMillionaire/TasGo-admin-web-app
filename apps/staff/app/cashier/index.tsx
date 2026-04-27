import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "@tasgo/i18n";
import { colors, typography, spacing, borderRadius, shadows } from "@tasgo/ui";
import { formatPrice } from "@tasgo/config";
import { supabase } from "@tasgo/supabase";
import type { Database } from "@tasgo/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface CartLine {
  product: Product;
  quantity: number;
}

export default function CashierScreen() {
  const { t } = useTranslation();
  const barcodeInputRef = useRef<TextInput>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const total = cart.reduce(
    (sum, line) => sum + line.product.price_uzs * line.quantity,
    0
  );

  const lookupProduct = useCallback(async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("barcode", trimmed)
      .eq("is_active", true)
      .single();
    if (error || !data) {
      setLastScanned(null);
      Alert.alert(t("staff.cashier.productNotFound"), trimmed);
      setBarcodeInput("");
      barcodeInputRef.current?.focus();
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === data.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === data.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [{ product: data, quantity: 1 }, ...prev];
    });
    setLastScanned(data.name_uz_latn ?? data.name_ru ?? trimmed);
    setBarcodeInput("");
    barcodeInputRef.current?.focus();
  }, [t]);

  const completeSaleMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const logs = cart.map((line) => ({
        product_id: line.product.id,
        action: "cashier_sale" as const,
        quantity_change: -line.quantity,
        performed_by: user.id,
      }));
      const { error } = await supabase.from("inventory_log").insert(logs);
      if (error) throw error;
    },
    onSuccess: () => {
      setCart([]);
      setLastScanned(null);
      setBarcodeInput("");
      barcodeInputRef.current?.focus();
      Alert.alert(t("staff.cashier.saleCompleted"));
    },
    onError: (err: Error) => {
      Alert.alert(t("common.error"), err.message);
    },
  });

  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    Alert.alert(
      t("staff.cashier.completeSale"),
      formatPrice(total),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.confirm"), onPress: () => completeSaleMutation.mutate() },
      ]
    );
  };

  const handleClearSale = () => {
    if (cart.length === 0) return;
    Alert.alert(
      t("staff.cashier.clearSale"),
      t("staff.cashier.clearSaleConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            setCart([]);
            setLastScanned(null);
            barcodeInputRef.current?.focus();
          },
        },
      ]
    );
  };

  const adjustQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => l.product.id === productId ? { ...l, quantity: l.quantity + delta } : l)
        .filter((l) => l.quantity > 0)
    );
  };

  const renderCartLine = ({ item }: { item: CartLine }) => (
    <View style={styles.cartLine}>
      {item.product.image_url ? (
        <Image source={{ uri: item.product.image_url }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <Ionicons name="cube-outline" size={24} color={colors.text.tertiary} />
        </View>
      )}
      <View style={styles.cartLineInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product.name_uz_latn ?? item.product.name_ru ?? "—"}
        </Text>
        <Text style={styles.productPrice}>{formatPrice(item.product.price_uzs)}</Text>
      </View>
      <View style={styles.qtyControl}>
        <TouchableOpacity style={styles.qtyButton} onPress={() => adjustQuantity(item.product.id, -1)}>
          <Ionicons name="remove" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyButton} onPress={() => adjustQuantity(item.product.id, 1)}>
          <Ionicons name="add" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.lineTotal}>
        {formatPrice(item.product.price_uzs * item.quantity)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("staff.cashier.title")}</Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={handleClearSale} style={styles.clearButton}>
              <Ionicons name="trash-outline" size={20} color={colors.status.error} />
            </TouchableOpacity>
          )}
        </View>

        {/* Barcode Input */}
        <View style={styles.scanRow}>
          <Ionicons
            name="barcode-outline"
            size={24}
            color={colors.text.secondary}
            style={styles.scanIcon}
          />
          <TextInput
            ref={barcodeInputRef}
            style={styles.barcodeInput}
            value={barcodeInput}
            onChangeText={setBarcodeInput}
            onSubmitEditing={() => lookupProduct(barcodeInput)}
            placeholder={t("staff.cashier.scanHint")}
            placeholderTextColor={colors.text.tertiary}
            autoFocus
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {barcodeInput.length > 0 && (
            <TouchableOpacity onPress={() => lookupProduct(barcodeInput)}>
              <Ionicons name="arrow-forward-circle" size={28} color={colors.primary[800]} />
            </TouchableOpacity>
          )}
        </View>

        {lastScanned && (
          <View style={styles.lastScannedBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.status.success} />
            <Text style={styles.lastScannedText}>{lastScanned}</Text>
          </View>
        )}

        {/* Cart or empty state */}
        {cart.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="scan-outline" size={64} color={colors.surface.border} />
            <Text style={styles.emptyText}>{t("staff.cashier.scanProduct")}</Text>
          </View>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={(item) => item.product.id}
            renderItem={renderCartLine}
            style={styles.cartList}
            contentContainerStyle={styles.cartContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {/* Footer */}
        {cart.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("staff.cashier.total")}</Text>
              <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.completeButton,
                completeSaleMutation.isPending && styles.completeButtonDisabled,
              ]}
              onPress={handleCompleteSale}
              disabled={completeSaleMutation.isPending}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.completeButtonText}>
                {completeSaleMutation.isPending
                  ? t("common.loading")
                  : t("staff.cashier.completeSale")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
    backgroundColor: colors.surface.card,
  },
  headerTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  clearButton: { padding: spacing[2] },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: spacing[4],
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...shadows.sm,
  },
  scanIcon: { marginRight: spacing[3] },
  barcodeInput: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.primary,
    paddingVertical: spacing[2],
  },
  lastScannedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.status.successBg,
    borderRadius: borderRadius.md,
  },
  lastScannedText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.status.success,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    textAlign: "center",
  },
  cartList: { flex: 1 },
  cartContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[4] },
  cartLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  productImage: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface.border,
  },
  productImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cartLineInfo: { flex: 1 },
  productName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  productPrice: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface.hover,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    minWidth: 24,
    textAlign: "center",
  },
  lineTotal: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    minWidth: 80,
    textAlign: "right",
  },
  separator: {
    height: 1,
    backgroundColor: colors.surface.border,
    marginVertical: spacing[1],
  },
  footer: {
    padding: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    backgroundColor: colors.surface.card,
    ...shadows.md,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  totalLabel: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.secondary,
  },
  totalAmount: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
  },
  completeButtonDisabled: { opacity: 0.6 },
  completeButtonText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: "#fff",
  },
});
