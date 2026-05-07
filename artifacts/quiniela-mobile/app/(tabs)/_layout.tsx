import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useMessages } from "@/context/MessagesContext";

function TabBarButton({ children, style, onPress, onLongPress, accessibilityState }: any) {
  const colors = useColors();
  const focused = accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityState={accessibilityState}
      style={[
        style,
        {
          borderBottomWidth: 2.5,
          borderBottomColor: focused ? colors.primary : "transparent",
          backgroundColor: focused ? `${colors.primary}14` : "transparent",
          borderRadius: 0,
          marginHorizontal: 0,
          marginVertical: 0,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const { hasNew } = useMessages();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: isWeb ? 0 : safeAreaInsets.bottom,
          paddingHorizontal: 4,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "dark"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_600SemiBold",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => <Feather name="home" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="predictions"
        options={{
          title: "Pronósticos",
          tabBarIcon: ({ color }) => <Feather name="crosshair" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: "Resultados",
          tabBarIcon: ({ color }) => <Feather name="disc" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Tabla",
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="system"
        options={{
          title: "Sistema",
          tabBarIcon: ({ color }) => (
            <View style={{ position: "relative" }}>
              <Feather name="settings" size={21} color={color} />
              {hasNew && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.primary,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
