// Serves the QR payload only during the unlock window, judged by server time.
// The payload lives in the QR_SECRET secret, never in the site's code.

const WINDOW_START = 5 * 3600; // 05:00
const WINDOW_END = 5 * 3600 + 10 * 60; // 05:10

function localSecondsOfDay(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return get("hour") * 3600 + get("minute") * 60 + get("second");
}

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*"
        }
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname !== "/qr") {
            return json({ error: "not found" }, 404);
        }
        if (!env.QR_SECRET) {
            return json({ error: "QR_SECRET not configured" }, 500);
        }

        const now = new Date();
        const secs = localSecondsOfDay(now, env.TIMEZONE || "Europe/London");

        if (secs >= WINDOW_START && secs < WINDOW_END) {
            return json({
                unlocked: true,
                payload: env.QR_SECRET,
                relockAt: now.getTime() + (WINDOW_END - secs) * 1000
            });
        }

        const wait = (WINDOW_START - secs + 86400) % 86400;
        return json({
            unlocked: false,
            unlockAt: now.getTime() + wait * 1000
        });
    }
};
