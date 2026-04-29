import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const GET_ALERT_STATUS_URL =
  "https://konfeejvlrpykdwrqrkg.supabase.co/functions/v1/get-alert-status";
const CANCEL_ALERT_URL =
  "https://konfeejvlrpykdwrqrkg.supabase.co/functions/v1/cancel-alert";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvbmZlZWp2bHJweWtkd3JxcmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Nzk2NjMsImV4cCI6MjA4NzM1NTY2M30.g9Ho7Hhekce2pYcrzrXesUFSRBLbAM-S9701COssu7s";

export default function AlertStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const alertId = typeof params.alertId === "string" ? params.alertId : "";

  const [loading, setLoading] = useState(true);
  const [alertData, setAlertData] = useState<any>(null);

  async function loadStatus() {
    if (!alertId) {
      Alert.alert("Eroare", "Lipsește ID-ul alertei.");
      router.replace("/");
      return;
    }

    try {
      const res = await fetch(
        `${GET_ALERT_STATUS_URL}?alert_id=${encodeURIComponent(alertId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );

      const raw = await res.text();
      let data: any = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}

      if (!res.ok) {
        Alert.alert("Eroare", data?.message ?? raw ?? "Nu pot verifica alerta.");
        return;
      }

      setAlertData(data.alert);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Eroare", `Nu pot încărca statusul: ${msg}`);
    } finally {
      setLoading(false);
    }
  }
async function cancelAlert() {
  if (!alertId) return;

  Alert.alert(
    "Anulezi alerta?",
    "Alerta nu va mai apărea voluntarilor.",
    [
      { text: "Nu", style: "cancel" },
      {
        text: "Anulează alerta",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(CANCEL_ALERT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                apikey: SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ alert_id: alertId }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
              Alert.alert(
                "Conexiune instabilă",
                "Nu am putut anula alerta momentan. Încearcă din nou."
              );
              return;
            }

            setAlertData(data.alert);

            Alert.alert(
              "Alertă anulată",
              "Alerta a fost anulată cu succes."
            );
          } catch {
            Alert.alert(
              "Conexiune instabilă",
              "Serviciul este ocupat momentan. Încearcă din nou în câteva secunde."
            );
          }
        },
      },
    ]
  );
}
  useEffect(() => {
    loadStatus();

    const interval = setInterval(loadStatus, 7000);
    return () => clearInterval(interval);
  }, [alertId]);

  const status = alertData?.status;

 const statusText =
  status === "open"
    ? "Căutăm un voluntar disponibil"
    : status === "assigned"
    ? "Un voluntar a preluat cazul"
    : status === "resolved"
    ? "Cazul a fost finalizat"
    : status === "cancelled"
    ? "Alertă anulată"
    : "Status necunoscut";

  const statusColor =
  status === "open"
    ? "#7EC8E3"
    : status === "assigned"
    ? "#FFD166"
    : status === "resolved"
    ? "#7CFF9B"
    : status === "cancelled"
    ? "#E63946"
    : "#A9C1D9";
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Se verifică alerta...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.kicker}>SEMNAL TRIMIS</Text>
        <Text style={styles.title}>Status alertă</Text>
        <Text style={styles.subtitle}>
          Poți rămâne pe acest ecran pentru actualizări.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.icon}>{alertData?.icon}</Text>
        <Text style={styles.alertTitle}>{alertData?.type_label}</Text>
        <Text style={styles.alertMeta}>Gravitate: {alertData?.severity}/5</Text>

        {!!alertData?.description && (
          <Text style={styles.description}>{alertData.description}</Text>
        )}
      </View>

      <View style={styles.statusCard}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>Status curent</Text>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>

          {status === "assigned" && !!alertData?.assigned_to_name && (
            <Text style={styles.smallText}>
              Preluat de: {alertData.assigned_to_name}
            </Text>
          )}

          {status === "resolved" && !!alertData?.resolution_note && (
            <Text style={styles.smallText}>
              Rezolvare: {alertData.resolution_note}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadStatus}>
          <Text style={styles.refreshText}>Actualizează status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.emergencyBtn}
          onPress={() => Linking.openURL("tel:112")}
        >
          <Text style={styles.emergencyText}>Sunați 112</Text>
        </TouchableOpacity>

        {status !== "resolved" && status !== "cancelled" ? (
  <TouchableOpacity
    style={styles.cancelBtn}
    onPress={cancelAlert}
  >
    <Text style={styles.cancelText}>Anulează alerta</Text>
  </TouchableOpacity>
) : (
  <TouchableOpacity
    style={styles.secondaryBtn}
    onPress={() => router.replace("/")}
  >
    <Text style={styles.secondaryText}>Înapoi acasă</Text>
  </TouchableOpacity>
)}
      </View>

      <Text style={styles.footer}>
        SilentSignal nu înlocuiește serviciile de urgență. Dacă situația este critică, sună la 112.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1C2D",
    padding: 20,
  },
  cancelBtn: {
  backgroundColor: "#122B40",
  borderWidth: 1,
  borderColor: "#E63946",
  paddingVertical: 16,
  borderRadius: 16,
  alignItems: "center",
},

cancelText: {
  color: "#FFFFFF",
  fontWeight: "900",
},

  center: {
    flex: 1,
    backgroundColor: "#0B1C2D",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    color: "#A9C1D9",
    marginTop: 10,
  },
  header: {
    marginTop: 70,
    marginBottom: 22,
  },
  kicker: {
    color: "#7EC8E3",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    color: "#A9C1D9",
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#122B40",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1F4B68",
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 46,
    marginBottom: 10,
  },
  alertTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  alertMeta: {
    color: "#A9C1D9",
    marginTop: 6,
    fontWeight: "800",
  },
  description: {
    color: "#FFFFFF",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: "#122B40",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1F4B68",
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  statusLabel: {
    color: "#A9C1D9",
    fontSize: 12,
    fontWeight: "800",
  },
  statusText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
  },
  smallText: {
    color: "#A9C1D9",
    marginTop: 6,
    lineHeight: 18,
  },
  actions: {
    marginTop: 22,
    gap: 12,
  },
  refreshBtn: {
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#1F4B68",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  refreshText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  emergencyBtn: {
    backgroundColor: "#E63946",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  emergencyText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: {
    color: "#A9C1D9",
    fontWeight: "800",
  },
  footer: {
    color: "#6C8CA6",
    fontSize: 11,
    textAlign: "center",
    marginTop: "auto",
    lineHeight: 16,
  },
});
