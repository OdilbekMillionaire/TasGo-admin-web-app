import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@tasgo/supabase";
import { colors } from "@tasgo/ui";

export default function IndexScreen() {
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.replace("/(tabs)");
        return;
      }

      // No session — check if user has previously selected a language
      const savedLang = await AsyncStorage.getItem("tasgo_language");
      if (savedLang) {
        router.replace("/(auth)/phone");
      } else {
        router.replace("/(auth)/language");
      }
    }

    void checkAuth();
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
});
