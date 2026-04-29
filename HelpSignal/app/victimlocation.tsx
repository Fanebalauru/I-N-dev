export const options = { title: "Ajutor" };

import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvbmZlZWp2bHJweWtkd3JxcmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Nzk2NjMsImV4cCI6MjA4NzM1NTY2M30.g9Ho7Hhekce2pYcrzrXesUFSRBLbAM-S9701COssu7s";

const CREATE_ALERT_URL =
  "https://konfeejvlrpykdwrqrkg.supabase.co/functions/v1/smooth-responder";

type AlertType = {
  id: string;
  label: string;
  icon: string;
  requiredRole: string;
};

const ALERT_TYPES: AlertType[] = [
  { id: "FOOD", label: "Lipsă mâncare", icon: "🥖", requiredRole: "volunteer" },
  { id: "WATER", label: "Lipsă apă", icon: "💧", requiredRole: "volunteer" },
  { id: "SHELTER", label: "Adăpost", icon: "🏠", requiredRole: "volunteer" },
  { id: "AMBULANCE", label: "Transport urgent", icon: "🚑", requiredRole: "volunteer" },
  { id: "MEDICAL", label: "Urgență medicală", icon: "🩺", requiredRole: "volunteer" },
  { id: "INJURY", label: "Rănire", icon: "🩹", requiredRole: "volunteer" },
  { id: "BABY", label: "Copil / bebeluș", icon: "👶", requiredRole: "volunteer" },
  { id: "LOST", label: "Persoană pierdută", icon: "🧭", requiredRole: "volunteer" },
  { id: "DANGER", label: "Pericol", icon: "⚠️", requiredRole: "volunteer" },
  { id: "PANIC", label: "Panică", icon: "😰", requiredRole: "volunteer" },
  { id: "TRANSLATE", label: "Traducere", icon: "🗣️", requiredRole: "volunteer" },
  { id: "OTHER", label: "Altceva", icon: "❓", requiredRole: "volunteer" },
];

export default function VictimLocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [otherDescription, setOtherDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("Obținere locație...");
  const [selectedType, setSelectedType] = useState<AlertType | null>(null);
  const [severity, setSeverity] = useState<number>(3);
  const [sending, setSending] = useState(false);

  const fade = useMemo(() => new Animated.Value(0), []);
  const slide = useMemo(() => new Animated.Value(16), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 550, useNativeDriver: true }),
    ]).start();
  }, []);

  const preselected = useMemo(() => {
    const symbol = typeof params?.symbol === "string" ? params.symbol : "";
    if (!symbol) return null;
    return ALERT_TYPES.find((t) => t.icon === symbol) ?? null;
  }, [params]);

  useEffect(() => {
    if (preselected && !selectedType) setSelectedType(preselected);
  }, [preselected, selectedType]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationStatus("Permisiune locație refuzată");
        Alert.alert(
          "Permisiune refuzată",
          "Aplicația are nevoie de locația ta pentru a trimite alerta."
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      setLocationStatus("Locație obținută");
    })();
  }, []);

  const handleSendAlert = async () => {
  if (!location) {
    Alert.alert("Eroare", "Locația nu este disponibilă.");
    return;
  }

  if (!selectedType) {
    Alert.alert("Alege o nevoie", "Selectează un tip de alertă.");
    return;
  }

  if (selectedType.id === "OTHER" && !otherDescription.trim()) {
    Alert.alert("Descriere necesară", "Completează descrierea.");
    return;
  }

  setSending(true);

  try {
    const res = await fetch(CREATE_ALERT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type_id: selectedType.id,
        type_label: selectedType.label,
        icon: selectedType.icon,
        required_role: selectedType.requiredRole,
        severity,
        lat: location.lat,
        lng: location.lng,
        description:
          selectedType.id === "OTHER" ? otherDescription.trim() : undefined,
      }),
    });

    const raw = await res.text();
    let data: any = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {}

    if (!res.ok) {
      Alert.alert(
        "Conexiune instabilă",
        "Serviciul este ocupat momentan. Încearcă din nou."
      );
      return;
    }

    const newAlertId = data?.alert?.id;

    if (!newAlertId) {
      Alert.alert(
        "Alertă trimisă",
        "Cererea a fost trimisă, dar nu pot deschide tracking-ul."
      );
      return;
    }

    setOtherDescription("");
    setSelectedType(null);
    setSeverity(3);

    router.replace({
      pathname: "/alertstatus",
      params: { alertId: newAlertId },
    });
  } catch {
    Alert.alert(
      "Conexiune instabilă",
      "Serviciul este ocupat momentan. Încearcă din nou în câteva secunde."
    );
  } finally {
    setSending(false);
  }
};
  const handleCallEmergency = () => {
    Linking.openURL("tel:112");
  };

  const severityLabel =
    severity <= 2 ? "Minor" : severity === 3 ? "Mediu" : severity === 4 ? "Urgent" : "Critic";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
     <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/")}>
  <Text style={styles.backText}>← Înapoi</Text>
     </TouchableOpacity>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        style={{ opacity: fade, transform: [{ translateY: slide }] }}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Trimite un semnal</Text>
          <Text style={styles.title}>De ce ai nevoie?</Text>
          <Text style={styles.subtitle}>
            Alege un simbol. Nu trebuie să explici dacă nu poți.
          </Text>
        </View>

        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>Locație</Text>
          <Text style={styles.locationText}>
            {location ? "📍 Locație pregătită" : locationStatus}
          </Text>
        </View>

        <View style={styles.cardsGrid}>
          {ALERT_TYPES.map((t) => {
            const active = selectedType?.id === t.id;

            return (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.82}
                style={[styles.alertCard, active && styles.alertCardActive]}
                onPress={() => setSelectedType(t)}
              >
                <Text style={styles.alertIcon}>{t.icon}</Text>
                <Text style={[styles.alertLabel, active && styles.alertLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.severityCard}>
          <View style={styles.severityHeader}>
            <Text style={styles.sectionTitle}>Gravitate</Text>
            <Text style={styles.severityValue}>{severity}/5 • {severityLabel}</Text>
          </View>

          <View style={styles.sevRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setSeverity(n)}
                style={[
                  styles.sevSegment,
                  severity >= n && styles.sevSegmentActive,
                  severity >= 4 && severity >= n && styles.sevSegmentCritical,
                ]}
              />
            ))}
          </View>

          <Text style={styles.helper}>
            1 = minor, 5 = critic. Dacă nu ești sigur, lasă 3.
          </Text>
        </View>

        {selectedType?.id === "OTHER" && (
          <View style={styles.otherCard}>
            <Text style={styles.sectionTitle}>Ce se întâmplă?</Text>
            <Text style={styles.helper}>
              Scrie scurt: unde ești, câte persoane sunt, ce risc există.
            </Text>

            <TextInput
              style={styles.inputOther}
              value={otherDescription}
              onChangeText={setOtherDescription}
              placeholder="Ex: Suntem blocați / nu pot respira / avem nevoie de traducere..."
              placeholderTextColor="#7FA0BD"
              multiline
              maxLength={240}
              textAlignVertical="top"
            />

            <Text style={styles.counter}>{otherDescription.trim().length}/240</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.sendButton, sending && styles.btnDisabled]}
          onPress={handleSendAlert}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.sendText}>Trimite alerta</Text>
              <Text style={styles.sendSubtext}>
                Voluntarii validați vor primi semnalul
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.callButton}
          onPress={handleCallEmergency}
        >
          <Text style={styles.callText}>Sunați 112</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1C2D" },

  content: {
    padding: 20,
    paddingBottom: 36,
  },
  
backBtn: {
  alignSelf: "flex-start",
  marginLeft: 20,
  marginTop: 8,
  backgroundColor: "#122B40",
  borderWidth: 1,
  borderColor: "#1F4B68",
  paddingVertical: 9,
  paddingHorizontal: 14,
  borderRadius: 999,
},

backText: {
  color: "#FFFFFF",
  fontWeight: "900",
},

  header: {
    marginBottom: 18,
  },

  kicker: {
    color: "#7EC8E3",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  subtitle: {
    color: "#A9C1D9",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },

  locationCard: {
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#1F4B68",
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },

  locationLabel: {
    color: "#7EC8E3",
    fontWeight: "900",
    fontSize: 12,
    marginBottom: 4,
  },

  locationText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  alertCard: {
    width: "48%",
    minHeight: 98,
    backgroundColor: "#122B40",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F4B68",
    justifyContent: "center",
  },

  alertCardActive: {
    backgroundColor: "#E63946",
    borderColor: "#FF8A95",
    shadowColor: "#E63946",
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },

  alertIcon: {
    fontSize: 30,
    marginBottom: 8,
  },

  alertLabel: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },

  alertLabelActive: {
    color: "#FFFFFF",
  },

  severityCard: {
    marginTop: 18,
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#1F4B68",
    padding: 14,
    borderRadius: 18,
  },

  severityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },

  severityValue: {
    color: "#A9C1D9",
    fontWeight: "900",
  },

  sevRow: {
    flexDirection: "row",
    gap: 8,
  },

  sevSegment: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#1A2B3C",
  },

  sevSegmentActive: {
    backgroundColor: "#7EC8E3",
  },

  sevSegmentCritical: {
    backgroundColor: "#E63946",
  },

  helper: {
    color: "#A9C1D9",
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
  },

  otherCard: {
    marginTop: 18,
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#E63946",
    padding: 14,
    borderRadius: 18,
  },

  inputOther: {
    backgroundColor: "#1A2B3C",
    color: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    marginTop: 12,
  },

  counter: {
    color: "#A9C1D9",
    textAlign: "right",
    marginTop: 8,
    fontSize: 12,
  },

  sendButton: {
    backgroundColor: "#E63946",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 22,
    shadowColor: "#E63946",
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  sendSubtext: {
    color: "#FFE1E4",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },

  callButton: {
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#1F4B68",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },

  callText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  btnDisabled: {
    opacity: 0.6,
  },
});