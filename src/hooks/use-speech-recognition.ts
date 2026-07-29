"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dictado con la Web Speech API del navegador (gratis y sin latencia: transcribe
 * mientras se habla). Chrome, Edge y Android la traen; Safari/iOS no, y ahí el
 * hook reporta `supported: false` para que la pantalla ofrezca otra vía.
 *
 * Es "mantener pulsado para hablar": nunca queda escuchando el salón por su
 * cuenta. El navegador necesita conexión para transcribir.
 */

interface SpeechAlternative { transcript: string }
interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternative;
}
interface SpeechEvent extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechResult };
}
interface SpeechErrorEvent extends Event { readonly error: string }

interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGE: Record<string, string> = {
  "not-allowed": "Falta permiso del micrófono. Habilítalo en el navegador y vuelve a intentar.",
  "service-not-allowed": "El navegador bloqueó el dictado. Revisa los permisos del sitio.",
  network: "Sin conexión: el dictado necesita internet.",
  "no-speech": "No escuché nada. Vuelve a intentarlo más cerca del micrófono.",
  "audio-capture": "No encontré micrófono disponible.",
};

export interface SpeechRecognitionState {
  supported: boolean;
  listening: boolean;
  /** Texto estable + lo que se está reconociendo ahora mismo. */
  transcript: string;
  error: string | null;
  /** Texto actual leído de una ref: útil justo después de `stop()`. */
  getTranscript: () => string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(lang = "es-CO"): SpeechRecognitionState {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Recognition | null>(null);
  // El último fragmento llega después de soltar el botón: el estado de React
  // aún no está actualizado cuando se lee dentro del callback, la ref sí.
  const stableRef = useRef("");
  const interimRef = useRef("");

  useEffect(() => {
    setSupported(getCtor() !== null);
    return () => {
      ref.current?.abort();
      ref.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    ref.current?.abort();
    setError(null);
    setInterim("");

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let stable = "";
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) stable += `${text} `;
        else pending += text;
      }
      if (stable) {
        setFinalText((prev) => `${prev}${stable}`);
        stableRef.current += stable;
      }
      setInterim(pending);
      interimRef.current = pending;
    };
    rec.onerror = (e) => {
      // "aborted" es el cierre normal al soltar el botón.
      if (e.error === "aborted") return;
      setError(ERROR_MESSAGE[e.error] ?? "No pude usar el micrófono. Inténtalo de nuevo.");
      setListening(false);
    };
    rec.onend = () => setListening(false);

    ref.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("El micrófono ya está en uso.");
    }
  }, [lang]);

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setFinalText("");
    setInterim("");
    setError(null);
    stableRef.current = "";
    interimRef.current = "";
  }, []);

  const getTranscript = useCallback(() => `${stableRef.current}${interimRef.current}`.trim(), []);

  return {
    supported,
    listening,
    transcript: `${finalText}${interim}`.trim(),
    error,
    getTranscript,
    start,
    stop,
    reset,
  };
}
