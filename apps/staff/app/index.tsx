import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { supabase } from "@tasgo/supabase";
import { colors } from "@tasgo/ui";
import type { UserRole } from "@tasgo/types";

const STAFF_ROLES: UserRole[] = ["collector", "carrier", "cashier"];

export default function StaffIndexScreen() {
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/(auth)/phone");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", session.user.id)
        .single();

      if (!profile || !profile.is_active || !STAFF_ROLES.includes(profile.role as UserRole)) {
        await supabase.auth.signOut();
        router.replace("/(auth)/phone");
        return;
      }

      router.replace(`/${profile.role}` as "/collector" | "/carrier" | "/cashier");
    }

    void checkAuth();
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.bg },
});
