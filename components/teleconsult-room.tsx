"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Video, X } from "lucide-react";
import {
  getOrCreateTeleconsultRoom,
  markTeleconsultJoined,
  markTeleconsultEnded,
} from "@/lib/actions/teleconsult-actions";
import { Button } from "@/components/ui/button";

// Jitsi's exported type for the external API constructor - kept minimal,
// just the surface this component actually uses.
type JitsiMeetExternalAPI = {
  addListener: (event: string, handler: () => void) => void;
  dispose: () => void;
};
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        width?: string | number;
        height?: string | number;
        configOverwrite?: Record<string, unknown>;
        interfaceConfigOverwrite?: Record<string, unknown>;
      }
    ) => JitsiMeetExternalAPI;
  }
}

const JITSI_DOMAIN = "meet.jit.si";
let jitsiScriptPromise: Promise<void> | null = null;

// A plain <iframe src="https://meet.jit.si/room"> gets intercepted by
// Jitsi's own anti-embedding check and redirected to their JaaS
// marketing page instead of the actual call - embedding only works
// through their documented IFrame External API
// (https://meet.jit.si/external_api.js), which is what this loads.
function loadJitsiScript(): Promise<void> {
  if (typeof window.JitsiMeetExternalAPI !== "undefined") {
    return Promise.resolve();
  }
  if (!jitsiScriptPromise) {
    jitsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        jitsiScriptPromise = null;
        reject(new Error("Could not load the call library."));
      };
      document.head.appendChild(script);
    });
  }
  return jitsiScriptPromise;
}

function roomNameFromLink(meetingLink: string): string {
  return meetingLink.split("/").pop() ?? meetingLink;
}

// Voice consults use the same Jitsi room, started audio-only with the
// camera off and video controls removed - a fraction of the bandwidth,
// so it holds up on 2G/weak 3G where video would freeze.
const VOICE_CONFIG = {
  prejoinPageEnabled: false,
  startAudioOnly: true,
  startWithVideoMuted: true,
  disableVideoQualityLabel: true,
  toolbarButtons: ["microphone", "hangup", "chat", "raisehand", "settings"],
};

export function TeleconsultRoom({
  appointmentId,
  mode = "video",
}: {
  appointmentId: number;
  mode?: "video" | "voice";
}) {
  const voice = mode === "voice";
  const height = voice ? 220 : 480;
  const [roomName, setRoomName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null);
  const endedRef = useRef(false);

  function closeRoom() {
    if (endedRef.current) return;
    endedRef.current = true;
    apiRef.current?.dispose();
    apiRef.current = null;
    setRoomName(null);
    markTeleconsultEnded(appointmentId);
  }

  // Waits for the container <div> to actually exist in the DOM (it
  // only renders once roomName is set) before instantiating Jitsi -
  // safer than guessing with requestAnimationFrame after setState.
  useEffect(() => {
    if (!roomName || !containerRef.current || !window.JitsiMeetExternalAPI) return;
    if (apiRef.current) return;
    endedRef.current = false;

    const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
      roomName,
      parentNode: containerRef.current,
      width: "100%",
      height,
      configOverwrite: voice ? VOICE_CONFIG : { prejoinPageEnabled: false },
      interfaceConfigOverwrite: { TOOLBAR_ALWAYS_VISIBLE: true },
    });
    apiRef.current = api;
    // Fires when the user hangs up from Jitsi's own toolbar - close our
    // side of the room too instead of leaving a dead iframe on screen.
    api.addListener("videoConferenceLeft", closeRoom);

    return () => {
      if (!endedRef.current) {
        apiRef.current?.dispose();
        apiRef.current = null;
        markTeleconsultEnded(appointmentId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]);

  async function handleJoin() {
    setLoading(true);
    setError(null);
    try {
      const result = await getOrCreateTeleconsultRoom(appointmentId, voice ? "Voice" : "Video");
      if (result.error) {
        setError(result.error);
        return;
      }
      await loadJitsiScript();
      if (!window.JitsiMeetExternalAPI) {
        throw new Error("Call library did not load.");
      }
      await markTeleconsultJoined(appointmentId);
      setRoomName(roomNameFromLink(result.meetingLink));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the call.");
    } finally {
      setLoading(false);
    }
  }

  if (!roomName) {
    return (
      <div className="rounded-lg border border-line bg-white p-4">
        <Button onClick={handleJoin} disabled={loading} className="gap-2">
          {voice ? <Phone className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          {loading ? "Starting..." : voice ? "Join voice consult" : "Join video consult"}
        </Button>
        {voice && (
          <p className="mt-2 text-xs text-ink/60">
            Audio only - works on a weak network. Keep this page open during the call.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-line" style={{ height }}>
      <button
        type="button"
        onClick={closeRoom}
        aria-label="Leave call"
        title="Leave call"
        className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
      >
        <X className="h-4 w-4" />
      </button>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
