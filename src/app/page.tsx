"use client";

import { FormEvent, useState } from "react";

const DEFAULT_ENDPOINT = "/api/v1/chat/credit";

export default function Home() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [payload, setPayload] = useState("{\n  \n}");
  const [taskId, setTaskId] = useState("");
  const [output, setOutput] = useState("Run an action to see response JSON here.");
  const [loading, setLoading] = useState(false);

  async function callKieApi(body: Record<string, unknown>) {
    setLoading(true);
    try {
      const response = await fetch("/api/kie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (error) {
      setOutput(
        JSON.stringify(
          {
            error: "Local request failed.",
            detail: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let parsedPayload: unknown = {};
    if (method === "POST") {
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        setOutput(
          JSON.stringify(
            { error: "Payload must be valid JSON for POST requests." },
            null,
            2,
          ),
        );
        return;
      }
    }

    void callKieApi({
      action: "request",
      endpoint,
      method,
      payload: parsedPayload,
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6 md:p-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Kie API Personal App</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Server-side proxy for Kie.ai using <code>KIE_API_KEY</code>. Safe for Vercel.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => void callKieApi({ action: "credit" })}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
            disabled={loading}
          >
            Check Credits
          </button>

          <button
            onClick={() => void callKieApi({ action: "status", taskId })}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
            disabled={loading || !taskId.trim()}
          >
            Check Task Status
          </button>
          <input
            type="text"
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
            placeholder="task_id"
            className="min-w-[220px] flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700"
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-lg font-medium">Custom Endpoint Request</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[120px_1fr]">
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as "GET" | "POST")}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
            <input
              type="text"
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder="/api/v1/..."
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            />
          </div>

          {method === "POST" && (
            <textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              className="h-36 w-full rounded-md border border-zinc-300 p-3 font-mono text-xs dark:border-zinc-700"
            />
          )}

          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={loading}
          >
            Send Request
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-lg font-medium">Response</h2>
        <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-50">
          {output}
        </pre>
      </section>
    </main>
  );
}
