"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = { role: string; content: string };
type Status = "idle" | "connecting" | "live";

export default function PersonaChat() {
  const clientRef = useRef<any>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [live, setLive] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const stop = useCallback(() => {
    try {
      clientRef.current?.stopStreaming();
    } catch {}
    clientRef.current = null;
    const video = document.getElementById("persona-video") as HTMLVideoElement | null;
    if (video) video.srcObject = null;
    setStatus("idle");
    setMessages([]);
    setLive("");
  }, []);

  // Clean up the session if the user navigates away
  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight });
  }, [messages]);

  async function start() {
    setError(null);
    setStatus("connecting");
    try {
      const res = await fetch("/api/session-token", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not start a session");

      // Load the SDK in the browser only
      const { createClient } = await import("@anam-ai/js-sdk");
      const { AnamEvent } = await import("@anam-ai/js-sdk/dist/module/types");

      const client = createClient(body.sessionToken);
      clientRef.current = client;

      client.addListener(AnamEvent.SESSION_READY, () => setStatus("live"));
      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (msgs: Message[]) =>
        setMessages([...msgs])
      );
      client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event: Message) => {
        if (event.role === "persona") setLive((t) => t + event.content);
        else if (event.role === "user") setLive("");
      });
      client.addListener(AnamEvent.CONNECTION_CLOSED, () => stop());

      await client.streamToVideoElement("persona-video");
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser settings and try again."
          : e instanceof Error
          ? e.message
          : "Something went wrong starting the chat."
      );
      stop();
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || !clientRef.current) return;
    setSending(true);
    try {
      await clientRef.current.talk(text);
      setDraft("");
    } catch {
      setError("Message failed to send. Try again.");
    } finally {
      setSending(false);
    }
  }

  const live_ = status === "live";

  return (
    <section className="chat">
      <div className="stage">
        <video id="persona-video" autoPlay playsInline />
        {status === "connecting" && <div className="overlay">Connecting to Muhaimin...</div>}
        {status === "idle" && <div className="overlay">Start a call to meet Muhaimin</div>}
      </div>

      <div className="controls">
        <button onClick={start} disabled={status !== "idle"} className="primary">
          Start call
        </button>
        <button onClick={stop} disabled={status === "idle"}>
          End call
        </button>
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <div className="live" aria-live="polite">
        <span>Muhaimin is saying</span>
        <p>{live || "…"}</p>
      </div>

      <div className="history" ref={historyRef}>
        {messages.length === 0 ? (
          <p className="muted">Your conversation will appear here.</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "user" : "persona"}`}>
              <strong>{m.role === "user" ? "You" : "Muhaimin"}</strong>
              <span>{m.content}</span>
            </div>
          ))
        )}
      </div>

      <div className="send">
        <textarea
          value={draft}
          disabled={!live_}
          rows={2}
          placeholder={live_ ? "Type a message for Muhaimin to repeat" : "Start call to send messages"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} disabled={!live_ || sending || !draft.trim()} className="primary">
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </section>
  );
}
