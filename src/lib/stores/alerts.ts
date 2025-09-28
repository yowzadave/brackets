import { writable } from "svelte/store";

type Alert = {
  id?: string;
  type?: "info" | "ok" | "warning" | "error" | "danger";
  message: string;
  timeout?: number | null; // in ms, null means no timeout
  timeoutId?: ReturnType<typeof setTimeout> | null;
}

function createAlertsStore() {
  const { subscribe, set, update } = writable([] as Alert[]);

  return {
    subscribe,
    set,
    update,
    add: (alert: Alert) => {
      const a: Alert = {
        id: crypto.randomUUID(),
        type: "info",
        timeout: 4000,
        ...alert,
        timeoutId: null,
      };

      let timeoutId;
      if (a.timeout !== null) {
        timeoutId = setTimeout(() => {
          update((alerts) => {
            return alerts.filter((a) => a.id !== a.id);
          });
        }, a.timeout);
        a.timeoutId = timeoutId;
      }

      update((alerts) => {
        alerts.push(a);
        return alerts;
      });
    },
    remove: (id: string) => {
      update((alerts) => {
        const alert = alerts.find((a) => a.id === id);
        if (alert && alert.timeoutId) {
          clearTimeout(alert.timeoutId);
        }

        return alerts.filter((a) => a.id !== id);
      });
    },
  };
}

export const alerts = createAlertsStore();
