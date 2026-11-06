"use client";

/**
 * The phone-as-dictaphone page's strings.
 *
 * Split out of the shared dictionary because every page used to download
 * all three languages of every string in the product. The login page was
 * parsing 200 KB of report-view labels it could never show.
 */

import { registerMessages } from "./i18n";

registerMessages({
  es: {
    "rdp.title": "Dictáfono",
    "rdp.connecting": "Conectando…",
    "rdp.connected": "Conectado al ordenador",
    "rdp.no_desktop": "No se detecta el ordenador. Mantén Radiogen.ai abierto en tu ordenador.",
    "rdp.tap_start": "Toca para dictar",
    "rdp.tap_stop": "Toca para terminar",
    "rdp.listening": "Escuchando…",
    "rdp.text_on_desktop": "El texto aparece en la pantalla de tu ordenador.",
    "rdp.refining": "Puliendo transcripción…",
    "rdp.invalid": "Enlace no válido o caducado. Genera un nuevo código QR desde el ordenador.",
    "rdp.ended": "Sesión finalizada. Puedes cerrar esta página.",
    "rdp.keep_open": "Mantén esta pantalla encendida mientras dictas.",
  },
  en: {
    "rdp.title": "Dictaphone",
    "rdp.connecting": "Connecting…",
    "rdp.connected": "Connected to your computer",
    "rdp.no_desktop": "Computer not detected. Keep Radiogen.ai open on your computer.",
    "rdp.tap_start": "Tap to dictate",
    "rdp.tap_stop": "Tap to finish",
    "rdp.listening": "Listening…",
    "rdp.text_on_desktop": "The text appears on your computer screen.",
    "rdp.refining": "Polishing transcription…",
    "rdp.invalid": "Invalid or expired link. Generate a new QR code from your computer.",
    "rdp.ended": "Session ended. You can close this page.",
    "rdp.keep_open": "Keep this screen on while dictating.",
  },
  pt: {
    "rdp.title": "Ditafone",
    "rdp.connecting": "Conectando…",
    "rdp.connected": "Conectado ao computador",
    "rdp.no_desktop": "Computador não detectado. Mantenha o Radiogen.ai aberto no seu computador.",
    "rdp.tap_start": "Toque para ditar",
    "rdp.tap_stop": "Toque para terminar",
    "rdp.listening": "Ouvindo…",
    "rdp.text_on_desktop": "O texto aparece na tela do seu computador.",
    "rdp.refining": "Polindo transcrição…",
    "rdp.invalid": "Link inválido ou expirado. Gere um novo código QR do computador.",
    "rdp.ended": "Sessão encerrada. Você pode fechar esta página.",
    "rdp.keep_open": "Mantenha esta tela ligada enquanto dita.",
  },
});
