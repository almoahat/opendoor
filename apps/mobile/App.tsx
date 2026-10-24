import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { EventType, ZoomVideoSdkProvider, useZoom } from "@zoom/react-native-videosdk";

// Spike only: the token comes from apps/mobile/.env.local, which git ignores.
const SESSION_NAME = "opendoor-spike";
const TOKEN = process.env.EXPO_PUBLIC_ZOOM_SPIKE_TOKEN ?? "";

function CallTest() {
  const zoom = useZoom();
  const [status, setStatus] = useState("Not joined");

  // Listen for what the SDK reports back
  useEffect(() => {
    const joined = zoom.addListener(EventType.onSessionJoin, () => setStatus("Joined session"));
    const left = zoom.addListener(EventType.onSessionLeave, () => setStatus("Left session"));
    const failed = zoom.addListener(EventType.onError, (e: unknown) =>
      setStatus(`Error: ${JSON.stringify(e)}`)
    );
    return () => {
      joined.remove();
      left.remove();
      failed.remove();
    };
  }, [zoom]);

  const join = async () => {
    if (!TOKEN) {
      setStatus("No token found. Check apps/mobile/.env.local");
      return;
    }
    setStatus("Joining...");
    try {
      await zoom.joinSession({
        sessionName: SESSION_NAME,
        token: TOKEN,
        userName: "Hatoon (phone)",
        audioOptions: { connect: true, mute: false, autoAdjustSpeakerVolume: false },
        videoOptions: { localVideoOn: false }, // camera off by default
        sessionIdleTimeoutMins: 10,
      });
    } catch (e) {
      setStatus(`Join failed: ${String(e)}`);
    }
  };

  const leave = async () => {
    await zoom.leaveSession(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OpenDoor SDK spike</Text>
      <Text style={styles.status}>{status}</Text>
      <Button title="Join" onPress={join} />
      <Button title="Leave" onPress={leave} />
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <ZoomVideoSdkProvider config={{ appGroupId: "group.dev.almoahat.opendoor", domain: "zoom.us", enableLog: true }}>
      <CallTest />
    </ZoomVideoSdkProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  title: { fontSize: 20, fontWeight: "600" },
  status: { fontSize: 16, textAlign: "center" },
});