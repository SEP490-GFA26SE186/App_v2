import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Comfortaa_600SemiBold, Comfortaa_700Bold, useFonts } from "@expo-google-fonts/comfortaa";
import { NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_800ExtraBold } from "@expo-google-fonts/nunito-sans";
import { Toaster } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useParent";
import useAuthStore from "@/stores/authStore";
import { useKidSessionStore, useParentStore } from "@/stores/sessionStores";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

/** Chờ các store lưu trong AsyncStorage nạp xong, tránh chớp màn đăng nhập khi đã có phiên. */
function useHydrated() {
  const stores = [useAuthStore, useKidSessionStore, useParentStore];
  const [hydrated, setHydrated] = useState(() => stores.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    const check = () => setHydrated(stores.every((s) => s.persist.hasHydrated()));
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- danh sách store cố định
  }, []);
  return hydrated;
}

function RootNavigator() {
  useCurrentUser();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const inKidMode = useKidSessionStore((s) => !!s.token);

  // Đang ở Kid Mode: máy đang ở tay bé → không mở trang của người lớn cho tới khi nhập PIN.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Protected guard={inKidMode} redirectTo={isAuthenticated ? "/" : "/login"}>
        <Stack.Screen name="kid" />
      </Stack.Protected>
      <Stack.Protected guard={!inKidMode && isAuthenticated} redirectTo={inKidMode ? "/kid" : "/login"}>
        <Stack.Screen name="(parent)" />
      </Stack.Protected>
      <Stack.Protected guard={!inKidMode && !isAuthenticated} redirectTo={inKidMode ? "/kid" : "/"}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Comfortaa_600SemiBold,
    Comfortaa_700Bold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });
  const hydrated = useHydrated();
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <RootNavigator />
        <Toaster />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
