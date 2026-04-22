"use client";

import { useState } from "react";

const ASPECT_RATIOS = [
  "auto",
  "1:1",
  "5:4",
  "9:16",
  "21:9",
  "16:9",
  "4:3",
  "3:2",
  "4:5",
  "3:4",
  "2:3",
] as const;

export default function Home() {
  const [textPrompt, setTextPrompt] = useState("");
  const [textAspectRatio, setTextAspectRatio] =
    useState<(typeof ASPECT_RATIOS)[number]>("auto");
  const [textNsfwChecker, setTextNsfwChecker] = useState(false);
  const [textCallbackUrl, setTextCallbackUrl] = useState("");

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrlsRaw, setImageUrlsRaw] = useState("");
  const [imageAspectRatio, setImageAspectRatio] =
    useState<(typeof ASPECT_RATIOS)[number]>("auto");
  const [imageNsfwChecker, setImageNsfwChecker] = useState(false);
  const [imageCallbackUrl, setImageCallbackUrl] = useState("");

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
      return data;
    } catch (error) {
      const errorPayload = {
        error: "Local request failed.",
        detail: error instanceof Error ? error.message : String(error),
      };
      setOutput(JSON.stringify(errorPayload, null, 2));
      return errorPayload;
    } finally {
      setLoading(false);
    }
  }

  async function createTextToImageTask() {
    if (!textPrompt.trim()) {
      setOutput(JSON.stringify({ error: "Prompt is required." }, null, 2));
      return;
    }

    const payload: Record<string, unknown> = {
      model: "gpt-image-2-text-to-image",
      input: {
        prompt: textPrompt.trim(),
        aspect_ratio: textAspectRatio,
        nsfw_checker: textNsfwChecker,
      },
    };

    if (textCallbackUrl.trim()) {
      payload.callBackUrl = textCallbackUrl.trim();
    }

    const result = await callKieApi({
      action: "request",
      endpoint: "/api/v1/jobs/createTask",
      method: "POST",
      payload,
    });

    const newTaskId = (result as { data?: { data?: { taskId?: string } } })?.data?.data
      ?.taskId;
    if (newTaskId) {
      setTaskId(newTaskId);
    }
  }

  async function createImageToImageTask() {
    if (!imagePrompt.trim()) {
      setOutput(JSON.stringify({ error: "Prompt is required." }, null, 2));
      return;
    }

    const inputUrls = imageUrlsRaw
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

    if (inputUrls.length === 0) {
      setOutput(
        JSON.stringify(
          { error: "At least one input URL is required for image-to-image." },
          null,
          2,
        ),
      );
      return;
    }

    if (inputUrls.length > 16) {
      setOutput(
        JSON.stringify({ error: "Maximum 16 input URLs are allowed." }, null, 2),
      );
      return;
    }

    const payload: Record<string, unknown> = {
      model: "gpt-image-2-image-to-image",
      input: {
        prompt: imagePrompt.trim(),
        input_urls: inputUrls,
        aspect_ratio: imageAspectRatio,
        nsfw_checker: imageNsfwChecker,
      },
    };

    if (imageCallbackUrl.trim()) {
      payload.callBackUrl = imageCallbackUrl.trim();
    }

    await callKieApi({
      action: "request",
      endpoint: "/api/v1/jobs/createTask",
      method: "POST",
      payload,
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6 md:p-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Kie API Personal App</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          GPT Image-2 task creator with a secure server-side proxy using{" "}
          <code>KIE_API_KEY</code>.
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
        <h2 className="mb-3 text-lg font-medium">GPT Image-2 Text to Image</h2>
        <div className="space-y-3">
          <textarea
            value={textPrompt}
            onChange={(event) => setTextPrompt(event.target.value)}
            placeholder="Prompt (required)"
            className="h-28 w-full rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={textAspectRatio}
              onChange={(event) =>
                setTextAspectRatio(event.target.value as (typeof ASPECT_RATIOS)[number])
              }
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              {ASPECT_RATIOS.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={textCallbackUrl}
              onChange={(event) => setTextCallbackUrl(event.target.value)}
              placeholder="Optional callback URL"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={textNsfwChecker}
              onChange={(event) => setTextNsfwChecker(event.target.checked)}
            />
            Enable NSFW checker
          </label>
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void createTextToImageTask()}
            disabled={loading}
          >
            Create Text-to-Image Task
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-lg font-medium">GPT Image-2 Image to Image</h2>
        <div className="space-y-3">
          <textarea
            value={imagePrompt}
            onChange={(event) => setImagePrompt(event.target.value)}
            placeholder="Prompt (required)"
            className="h-24 w-full rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700"
          />
          <textarea
            value={imageUrlsRaw}
            onChange={(event) => setImageUrlsRaw(event.target.value)}
            placeholder="Input image URLs (required, one URL per line, max 16)"
            className="h-28 w-full rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={imageAspectRatio}
              onChange={(event) =>
                setImageAspectRatio(event.target.value as (typeof ASPECT_RATIOS)[number])
              }
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              {ASPECT_RATIOS.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={imageCallbackUrl}
              onChange={(event) => setImageCallbackUrl(event.target.value)}
              placeholder="Optional callback URL"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={imageNsfwChecker}
              onChange={(event) => setImageNsfwChecker(event.target.checked)}
            />
            Enable NSFW checker
          </label>
          <button
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void createImageToImageTask()}
            disabled={loading}
          >
            Create Image-to-Image Task
          </button>
        </div>
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
