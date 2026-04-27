import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initI18n } from "@tasgo/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@tasgo/supabase";
import type { SupportedLocale } from "@tasgo/i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken() {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  if (!token) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Upsert token — avoid duplicates
  await supabase.from("push_tokens").upsert(
    { user_id: user.id, token, platform: Platform.OS as "ios" | "android" },
    { onConflict: "token" }
  );
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function init() {
      const savedLang =
        (await AsyncStorage.getItem("tasgo_language")) as SupportedLocale | null;
      initI18n(savedLang ?? "uz-latn");

      // Register push token after auth is settled
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        void registerPushToken();
      }

      // Also register on auth state change (login)
      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") void registerPushToken();
      });

      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    }
    void init();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" options={{ presentation: "card" }} />
        <Stack.Screen
          name="category/[id]"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="checkout"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="orders/[id]"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="rating/[orderId]"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="tracking/[orderId]"
          options={{ presentation: "card" }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
