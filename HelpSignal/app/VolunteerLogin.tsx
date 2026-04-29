export const options = { title: "Login voluntar" };

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PARTNER_CODE_URL =
  "https://konfeejvlrpykdwrqrkg.supabase.co/functions/v1/partner-code";

const REQUEST_ACCESS_URL =
  "https://konfeejvlrpykdwrqrkg.supabase.co/functions/v1/request-volunteer-access";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvbmZlZWp2bHJweWtkd3JxcmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Nzk2NjMsImV4cCI6MjA4NzM1NTY2M30.g9Ho7Hhekce2pYcrzrXesUFSRBLbAM-S9701COssu7s";

const ONG_OPTIONS = [
  "Crucea Roșie",
  "Caritas",
  "Salvați Copiii",
  "Asociație locală",
  "Alt ONG",
];

type Mode = "CODE" | "REQUEST";

export default function VolunteerLoginScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("CODE");

  const [accessCode, setAccessCode] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [ngoName, setNgoName] = useState("");
  const [customNgoName, setCustomNgoName] = useState("");
  const [motivation, setMotivation] = useState("");

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const canSubmitCode = accessCode.trim().length >= 6;

  const finalNgoName =
    ngoName === "Alt ONG" ? customNgoName.trim() : ngoName.trim();

  const canSubmitRequest =
    fullName.trim() &&
    email.trim() &&
    phone.trim() &&
    finalNgoName;

  async function handleCodeLogin() {
    const cleanCode = accessCode.trim();

    if (!canSubmitCode) {
      Alert.alert("Eroare", "Introdu un cod de acces valid.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(PARTNER_CODE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          institution: "ONG Demo",
          code: cleanCode,
        }),
      });

      const raw = await res.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}

      if (!res.ok) {
        Alert.alert("Cod invalid", data?.message ?? raw ?? "Codul nu este valid.");
        return;
      }

      const member = {
        isVerified: true,
        role: data?.member?.role ?? "volunteer",
        institution: data?.member?.institution ?? "ONG",
        fullName:
          data?.member?.fullName && String(data.member.fullName).trim()
            ? String(data.member.fullName).trim()
            : `Voluntar ${cleanCode.slice(-4)}`,
        email:
          data?.member?.email && String(data.member.email).trim()
            ? String(data.member.email).trim()
            : `${cleanCode.toLowerCase()}@voluntar.local`,
      };

      await AsyncStorage.setItem("stay_logged_in", stayLoggedIn ? "1" : "0");
      await AsyncStorage.setItem("auth_member", JSON.stringify(member));

      router.replace("/volunteermap");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Eroare", `Login eșuat: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestAccess() {
    if (!canSubmitRequest) {
      Alert.alert(
        "Date incomplete",
        "Completează numele, emailul, telefonul și ONG-ul."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(REQUEST_ACCESS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          dob: dob.trim(),
          ngo_name: finalNgoName,
          motivation: motivation.trim(),
        }),
      });

      const raw = await res.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}

      if (!res.ok) {
        Alert.alert("Eroare", data?.message ?? raw ?? "Nu s-a putut trimite cererea.");
        return;
      }

      Alert.alert(
        "Cerere trimisă",
        "Cererea ta a fost trimisă. ONG-ul va verifica datele și te va contacta."
      );

      setFullName("");
      setEmail("");
      setDob("");
      setPhone("");
      setNgoName("");
      setCustomNgoName("");
      setMotivation("");
      setMode("CODE");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Eroare", `Nu pot trimite cererea: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View
            style={{
              opacity: fade,
              transform: [{ translateY: slide }],
            }}
          >
            <View style={styles.header}>
              <Text style={styles.logo}>SilentSignal</Text>
              <Text style={styles.subtitle}>
                Acces pentru voluntari validați de ONG
              </Text>
            </View>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === "CODE" && styles.modeBtnActive]}
                onPress={() => setMode("CODE")}
              >
                <Text style={mode === "CODE" ? styles.modeTextActive : styles.modeText}>
                  Am cod
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeBtn, mode === "REQUEST" && styles.modeBtnActive]}
                onPress={() => setMode("REQUEST")}
              >
                <Text style={mode === "REQUEST" ? styles.modeTextActive : styles.modeText}>
                  Cer acces
                </Text>
              </TouchableOpacity>
            </View>

            {mode === "CODE" ? (
              <View style={styles.card}>
                <Text style={styles.label}>Cod de acces</Text>

                <TextInput
                  style={styles.input}
                  value={accessCode}
                  onChangeText={setAccessCode}
                  placeholder="Ex: IX0B25EEEB"
                  placeholderTextColor="#7FA0BD"
                  autoCapitalize="characters"
                />

                <View style={styles.stayRow}>
                  <Text style={styles.stayText}>Rămân conectat</Text>
                  <Switch value={stayLoggedIn} onValueChange={setStayLoggedIn} />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, (!canSubmitCode || loading) && styles.btnDisabled]}
                  onPress={handleCodeLogin}
                  disabled={!canSubmitCode || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Intră ca voluntar</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.helper}>
                  Codul este primit după validarea de către ONG.
                </Text>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.label}>Nume complet *</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nume și prenume"
                  placeholderTextColor="#7FA0BD"
                />

                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor="#7FA0BD"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Telefon *</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Număr de telefon"
                  placeholderTextColor="#7FA0BD"
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Data nașterii</Text>
                <TextInput
                  style={styles.input}
                  value={dob}
                  onChangeText={setDob}
                  placeholder="ZZ/LL/AAAA"
                  placeholderTextColor="#7FA0BD"
                />

                <Text style={styles.label}>ONG / Organizație *</Text>
                <View style={styles.pickerContainer}>
                  {ONG_OPTIONS.map((ong) => (
                    <TouchableOpacity
                      key={ong}
                      style={[
                        styles.pickerOption,
                        ngoName === ong && styles.pickerOptionSelected,
                      ]}
                      onPress={() => setNgoName(ong)}
                    >
                      <Text
                        style={
                          ngoName === ong
                            ? styles.pickerOptionTextSelected
                            : styles.pickerOptionText
                        }
                      >
                        {ong}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {ngoName === "Alt ONG" && (
                  <>
                    <Text style={styles.label}>Numele ONG-ului</Text>
                    <TextInput
                      style={styles.input}
                      value={customNgoName}
                      onChangeText={setCustomNgoName}
                      placeholder="Scrie numele ONG-ului"
                      placeholderTextColor="#7FA0BD"
                    />
                  </>
                )}

                <Text style={styles.label}>De ce vrei să fii voluntar?</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={motivation}
                  onChangeText={setMotivation}
                  placeholder="Scrie pe scurt experiența sau motivația ta..."
                  placeholderTextColor="#7FA0BD"
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.primaryButton, (!canSubmitRequest || loading) && styles.btnDisabled]}
                  onPress={handleRequestAccess}
                  disabled={!canSubmitRequest || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Trimite cererea</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.helper}>
                  Cererea va fi verificată de un ONG. Dacă ești eligibil, vei primi un cod de acces.
                </Text>
              </View>
            )}

            <Text style={styles.footerText}>
              Accesul este oferit doar voluntarilor verificați.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1C2D" },
  content: { padding: 20, paddingBottom: 40 },

  header: {
    marginTop: 70,
    marginBottom: 26,
  },
  logo: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#A9C1D9",
    marginTop: 8,
    fontSize: 15,
  },

  modeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  modeBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#1F4B68",
  },
  modeBtnActive: {
    backgroundColor: "#E63946",
    borderColor: "#E63946",
  },
  modeText: { color: "#A9C1D9", fontWeight: "900" },
  modeTextActive: { color: "#FFFFFF", fontWeight: "900" },

  card: {
    backgroundColor: "#122B40",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1F4B68",
  },

  label: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#1A2B3C",
    color: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#24465C",
  },
  textArea: {
    minHeight: 110,
  },

  stayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  stayText: {
    color: "#A9C1D9",
    fontWeight: "800",
  },

  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerOption: {
    backgroundColor: "#1A2B3C",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#24465C",
  },
  pickerOptionSelected: {
    backgroundColor: "#E63946",
    borderColor: "#E63946",
  },
  pickerOptionText: { color: "#A9C1D9", fontWeight: "800" },
  pickerOptionTextSelected: { color: "#FFFFFF", fontWeight: "900" },

  primaryButton: {
    backgroundColor: "#E63946",
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 18,
    shadowColor: "#E63946",
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  btnDisabled: { opacity: 0.5 },

  helper: {
    color: "#A9C1D9",
    marginTop: 12,
    lineHeight: 18,
    fontSize: 12,
  },

  footerText: {
    color: "#6C8CA6",
    textAlign: "center",
    fontSize: 12,
    marginTop: 26,
  },
});