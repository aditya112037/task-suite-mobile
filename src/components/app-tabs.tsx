
import { Tabs, usePathname, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const C = {
  teal: "#087A74",
  muted: "#60717F",
  pale: "#DDF1EB",
  white: "#FFFFFF",
};

function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const center = width / 2;
  const height = 174;
  const totalHeight = height + insets.bottom;

  // Top edge of the navigation background.
  const curve = [
    "M 0 0",
    `L ${center - 305} 0`,
    `C ${center - 265} 0 ${center - 245} 20 ${center - 210} 35`,
    `C ${center - 175} 50 ${center - 145} 42 ${center - 110} 42`,
    `C ${center - 65} 42 ${center - 48} 80 ${center} 102`,
    `C ${center + 48} 80 ${center + 65} 42 ${center + 110} 42`,
    `C ${center + 145} 42 ${center + 175} 50 ${center + 210} 35`,
    `C ${center + 245} 20 ${center + 265} 0 ${center + 305} 0`,
    `L ${width} 0`,
  ].join(" ");

  // This path fills only below the curved top edge.
  const whiteFill = [
    curve,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    "Z",
  ].join(" ");

  const items = [
    { label: "Dashboard", route: "/dashboard", ios: "house.fill", android: "home" },
    { label: "Tasks", route: "/remote-work", ios: "checklist", android: "checklist" },
    { label: "Teams", route: "/teams", ios: "person.3.fill", android: "groups" },
    { label: "Profile", route: "/profile", ios: "person.crop.circle", android: "account_circle" },
  ];

  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, { height: totalHeight }]}
    >
      <Svg
        pointerEvents="none"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={styles.svg}
      >
        <Path d={whiteFill} fill={C.white} />

        <Path
          d={curve}
          fill="none"
          stroke={C.teal}
          strokeWidth={3}
        />

        <Path
          d={`M 0 0 L 0 ${height} M ${width} 0 L ${width} ${height}`}
          fill="none"
          stroke={C.teal}
          strokeWidth={3}
        />
      </Svg>

      <View
        pointerEvents="box-none"
        style={[
          styles.row,
          { bottom: Math.max(insets.bottom, 12) + 9 },
        ]}
      >
        {items.slice(0, 2).map((item) => {
          const active = pathname === item.route;

          return (
            <Pressable
              key={item.route}
              style={styles.item}
              onPress={() => router.navigate(item.route as never)}
            >
              <View style={[styles.iconCircle, active && styles.activeCircle]}>
                <SymbolView
                  name={{ ios: item.ios, android: item.android }}
                  size={27}
                  tintColor={active ? C.teal : C.muted}
                />
              </View>
              <Text style={[styles.label, active && styles.activeLabel]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        <View style={styles.centerSpace} />

        {items.slice(2).map((item) => {
          const active = pathname === item.route;

          return (
            <Pressable
              key={item.route}
              style={styles.item}
              onPress={() => router.navigate(item.route as never)}
            >
              <View style={[styles.iconCircle, active && styles.activeCircle]}>
                <SymbolView
                  name={{ ios: item.ios, android: item.android }}
                  size={27}
                  tintColor={active ? C.teal : C.muted}
                />
              </View>
              <Text style={[styles.label, active && styles.activeLabel]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create task"
        style={styles.plus}
        onPress={() => router.push("/task-detail" as never)}
      >
        <SymbolView
          name={{ ios: "plus", android: "add" }}
          size={40}
          tintColor={C.white}
        />
      </Pressable>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={() => <CustomTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="remote-work" />
      <Tabs.Screen name="teams" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="calendar" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 20,
    elevation: 20,
  },
  svg: {
    position: "absolute",
    bottom: 0,
  },
  row: {
    position: "absolute",
    left: 5,
    right: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F3F1",
  },
  activeCircle: {
    backgroundColor: C.pale,
  },
  label: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "500",
  },
  activeLabel: {
    color: C.teal,
    fontWeight: "700",
  },
  centerSpace: {
    flex: 1,
  },
  plus: {
    position: "absolute",
    alignSelf: "center",
    top: 38,
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    borderColor: C.white,
    borderWidth: 5,
    elevation: 8,
    shadowColor: "#004D49",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});

