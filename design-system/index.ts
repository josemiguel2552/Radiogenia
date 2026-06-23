/**
 * @radiogenia/design-system
 *
 * Single entry point exposing design tokens, the UI component surface, and a
 * machine-readable component catalog. Intended to be read by design tooling
 * (e.g. Claude Design `/design-sync`) and imported by app code.
 */

export * from "./tokens";
export { default as tokens } from "./tokens";

export * from "./components";
export { catalog } from "./components/catalog";
export type { ComponentEntry } from "./components/catalog";
