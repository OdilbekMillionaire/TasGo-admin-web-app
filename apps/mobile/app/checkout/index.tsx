import { router } from "expo-router";
import { useEffect } from "react";

export default function CheckoutIndex() {
  useEffect(() => {
    router.replace("/checkout/address");
  }, []);
  return null;
}
