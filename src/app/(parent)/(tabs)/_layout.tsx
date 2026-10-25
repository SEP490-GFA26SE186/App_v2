import { Tabs } from "expo-router/js-tabs";
import { BookOpen, LayoutGrid, Menu, PenTool, Store, type LucideIcon } from "lucide-react-native";
import { colors, fonts } from "@/theme";

// Sidebar "Gia đình / Sáng tác & Chợ truyện / Tài khoản" của web → 4 tab hay dùng + tab "Thêm" chứa phần còn lại.
const TABS: { name: string; title: string; icon: LucideIcon }[] = [
  { name: "index", title: "Tổng quan", icon: LayoutGrid },
  { name: "library", title: "Tủ sách", icon: BookOpen },
  { name: "studio", title: "Sáng tác", icon: PenTool },
  { name: "marketplace", title: "Chợ truyện", icon: Store },
  { name: "more", title: "Thêm", icon: Menu },
];

export default function ParentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "rgba(30,41,59,0.55)",
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.outline, height: undefined },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      {TABS.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, size }) => <Icon color={color} size={size - 2} /> }} />
      ))}
    </Tabs>
  );
}
