// app/lib/statutoryAlerts.ts

export type StatutoryAlertType = "NCR_LEIN" | "POUR_APPROVED" | "PTW_EXPIRED" | "HINDRANCE_LOGGED";

export interface StatutoryAlertPayload {
    projectId: string;
    type: StatutoryAlertType;
    title: string;
    description: string;
    gridLocation?: string;
    amount?: number;
}

export function dispatchStatutoryNotification(payload: StatutoryAlertPayload) {
    // 1. Console & Event Telemetry
    console.info(`[STATUTORY EVENT: ${payload.type}]`, payload);

    // 2. Browser Native Notification (if permitted)
    if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
            new Notification(`Quadillar Statutory Gate: ${payload.title}`, {
                body: `${payload.description} ${payload.gridLocation ? `at ${payload.gridLocation}` : ""}`,
                icon: "/favicon.ico",
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                    new Notification(`Quadillar Statutory Gate: ${payload.title}`, {
                        body: payload.description,
                    });
                }
            });
        }
    }
}