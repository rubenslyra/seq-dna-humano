import script from "./script.json";

export function getSlideScript(slide: number) {
  if (!Number.isInteger(slide) || slide < 1 || slide > script.length) return undefined;
  return script[slide - 1];
}

export function ignoreDeckKeys(target: EventTarget | null, dialogOpen: boolean) {
  return dialogOpen || (target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]')));
}