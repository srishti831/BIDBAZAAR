import { useSyncExternalStore } from "react";
import { serverNow } from "@/lib/time";

// One shared 1-second clock for the whole app, instead of a timer per card.
const listeners = new Set();
let timer = null;

const subscribe = (callback) => {
  listeners.add(callback);
  if (!timer) {
    timer = setInterval(() => listeners.forEach((fn) => fn()), 1000);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};

const getSnapshot = () => Math.floor(serverNow() / 1000) * 1000;

export const useNow = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
