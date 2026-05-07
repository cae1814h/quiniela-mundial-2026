import { Feather } from "@expo/vector-icons";
import { useRegister } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");

  const { mutate, isPending } = useRegister({
    mutation: {
      onSuccess: async (data) => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(data.token, data.user);
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err?.data?.error ?? "No se pudo crear la cuenta");
      },
    },
  });

  const handleRegister = () => {
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError("Completa todos los campos");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    mutate({ data: { name: name.trim(), email: email.trim().toLowerCase(), password } });
  };

  return (
    <LinearGradient
      colors={["#060e1a", "#0b1628", "#060e1a"]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.brand}>
            <View style={[styles.logoCircle, { backgroundColor: "rgba(0,216,150,0.12)", borderColor: "rgba(0,216,150,0.3)" }]}>
              <Feather name="user-plus" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Crear cuenta</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Únete a la Quiniela Mundial 2026</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fields}>
              <View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Nombre</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <Feather name="user" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Tu nombre"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Correo electrónico</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <Feather name="mail" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@correo.com"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Contraseña</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <Feather name="lock" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPwd}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  <Pressable onPress={() => setShowPwd((v) => !v)} hitSlop={8}>
                    <Feather name={showPwd ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }, isPending && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Crear cuenta</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>¿Ya tienes cuenta? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={[styles.link, { color: colors.primary }]}>Iniciar sesión</Text>
                </Pressable>
              </Link>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 28 },
  brand: { alignItems: "center", gap: 10 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 1, padding: 24, gap: 20 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 8, borderWidth: 1, padding: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  fields: { gap: 16 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  linkRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  linkLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  link: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
