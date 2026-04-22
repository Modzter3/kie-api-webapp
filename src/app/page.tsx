"use client";

import Image from "next/image";
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

type AppMode = "text-to-image" | "image-to-image";
type Quality = "low" | "standard" | "high";
type NavItem = "generate" | "history" | "favorites" | "presets" | "settings";

export default function Home() {
  const [mode, setMode] = useState<AppMode>("text-to-image");
  const [navItem, setNavItem] = useState<NavItem>("generate");
  const [prompt, setPrompt] = useState(
    "A cozy cabin in the mountains during winter, snow falling, warm light from the windows, cinematic, highly detailed.",
  );
  const [aspectRatio, setAspectRatio] =
    useState<(typeof ASPECT_RATIOS)[number]>("1:1");
  const [quality, setQuality] = useState<Quality>("standard");
  const [inputUrlsRaw, setInputUrlsRaw] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [taskId, setTaskId] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("Ready to generate");
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [recentImages, setRecentImages] = useState<string[]>([]);
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

  function parseResultUrls(statusResponse: unknown): string[] {
    const resultJson = (
      statusResponse as {
        data?: { data?: { data?: { resultJson?: string; resultUrls?: string[] } } };
      }
    )?.data?.data?.data;

    if (!resultJson) return [];

    if (Array.isArray(resultJson.resultUrls)) {
      return resultJson.resultUrls.filter((value) => Boolean(value));
    }

    if (typeof resultJson.resultJson !== "string") {
      return [];
    }

    try {
      const parsed = JSON.parse(resultJson.resultJson) as { resultUrls?: string[] };
      return Array.isArray(parsed.resultUrls)
        ? parsed.resultUrls.filter((value) => Boolean(value))
        : [];
    } catch {
      return [];
    }
  }

  async function checkCredits() {
    const result = await callKieApi({ action: "credit" });
    const balance = (result as { data?: { data?: number } })?.data?.data;
    if (typeof balance === "number") {
      setCredits(balance);
      setStatusText(`Credits updated: ${balance}`);
    }
  }

  async function checkTaskStatus() {
    if (!taskId.trim()) {
      setOutput(JSON.stringify({ error: "Task ID is required." }, null, 2));
      return;
    }

    const result = await callKieApi({ action: "status", taskId: taskId.trim() });
    const state = (result as { data?: { data?: { data?: { state?: string } } } })?.data?.data
      ?.data?.state;
    if (state) {
      setStatusText(`Task state: ${state}`);
    }

    const urls = parseResultUrls(result);
    if (urls.length > 0) {
      setCurrentImageUrl(urls[0]);
      setRecentImages((previous) => {
        const next = [...urls, ...previous].filter(
          (value, index, arr) => arr.indexOf(value) === index,
        );
        return next.slice(0, 8);
      });
      setStatusText("Task completed successfully");
    }
  }

  async function generateImageTask() {
    if (!prompt.trim()) {
      setOutput(JSON.stringify({ error: "Prompt is required." }, null, 2));
      return;
    }

    const model =
      mode === "text-to-image"
        ? "gpt-image-2-text-to-image"
        : "gpt-image-2-image-to-image";

    const payload: Record<string, unknown> = {
      model,
      input: {
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
        nsfw_checker: false,
      },
    };

    if (mode === "image-to-image") {
      const inputUrls = inputUrlsRaw
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

      (payload.input as { input_urls?: string[] }).input_urls = inputUrls;
    }

    if (callbackUrl.trim()) {
      payload.callBackUrl = callbackUrl.trim();
    }

    setStatusText("Creating task...");
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
      setStatusText(`Task created: ${newTaskId}`);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1360px] p-4 text-zinc-100 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col rounded-2xl border border-white/10 bg-[#0d1224]/85 p-4 backdrop-blur">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/30 text-violet-200">
              ◎
            </div>
            <div>
              <p className="text-sm font-semibold">Personal GPT</p>
              <p className="text-xs text-zinc-400">2 Image Generator</p>
            </div>
          </div>

          <nav className="space-y-2 text-sm">
            {[
              { id: "generate" as const, icon: "⌂", label: "Generate" },
              { id: "history" as const, icon: "◷", label: "History" },
              { id: "favorites" as const, icon: "☆", label: "Favorites" },
              { id: "presets" as const, icon: "◫", label: "Presets" },
              { id: "settings" as const, icon: "⚙", label: "Settings" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setNavItem(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                  navItem === item.id
                    ? "bg-violet-500/25 text-violet-200"
                    : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-[#111a30] p-4">
            <div>
              <p className="text-xs text-zinc-400">Model</p>
              <p className="mt-1 text-sm font-medium">GPT-2 Image v1</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Resolution</p>
              <select
                value={aspectRatio}
                onChange={(event) =>
                  setAspectRatio(event.target.value as (typeof ASPECT_RATIOS)[number])
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1427] px-2 py-2 text-sm"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Quality</p>
              <div className="mt-1 grid grid-cols-3 gap-1 rounded-lg bg-[#0b1427] p-1 text-xs">
                {(["low", "standard", "high"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setQuality(value)}
                    className={`rounded-md px-2 py-1 capitalize ${
                      quality === value ? "bg-violet-500/35 text-violet-100" : "text-zinc-300"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#111a30] p-4">
            <p className="text-xs text-zinc-400">Credits</p>
            <p className="mt-2 text-lg font-semibold">{credits ?? "—"} / 500</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-400 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, ((credits ?? 0) / 500) * 100))}%` }}
              />
            </div>
            <button
              onClick={() => void checkCredits()}
              className="mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
              disabled={loading}
            >
              Refresh Credits
            </button>
          </div>

          <div className="mt-auto pt-4">
            <button className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#111a30] px-3 py-2 text-left">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-600 text-xs">
                JD
              </div>
              <div>
                <p className="text-xs text-zinc-200">Jane Doe</p>
                <p className="text-[11px] text-zinc-500">Personal workspace</p>
              </div>
            </button>
          </div>
        </aside>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1224]/70 p-4 backdrop-blur md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Generate Image</h1>
              <p className="mt-1 text-sm text-zinc-400">Create images with GPT Image-2</p>
            </div>
            <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300">
              Help
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111a30] p-4 shadow-[0_10px_40px_rgba(20,30,70,0.35)]">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the image you want to create..."
              className="h-36 w-full resize-none rounded-xl border border-white/10 bg-[#0b1427] p-4 text-sm outline-none focus:border-violet-400/40"
              maxLength={500}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">
                  Add Style
                </button>
                <button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">
                  Add Details
                </button>
                <button
                  onClick={() => setPrompt("")}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300"
                >
                  Clear
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">{prompt.length} / 500</span>
                <button
                  onClick={() => void generateImageTask()}
                  className="rounded-lg bg-violet-500 px-5 py-2 text-sm font-medium text-white shadow-[0_6px_24px_rgba(139,92,246,0.45)] disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Working..." : "Generate"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="rounded-xl border border-white/10 bg-[#111a30] p-3">
              <p className="mb-2 text-xs text-zinc-400">Mode</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("text-to-image")}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    mode === "text-to-image"
                      ? "bg-violet-500/35 text-violet-100"
                      : "border border-white/10 text-zinc-300"
                  }`}
                >
                  Text to Image
                </button>
                <button
                  onClick={() => setMode("image-to-image")}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    mode === "image-to-image"
                      ? "bg-violet-500/35 text-violet-100"
                      : "border border-white/10 text-zinc-300"
                  }`}
                >
                  Image to Image
                </button>
              </div>
              {mode === "image-to-image" && (
                <textarea
                  value={inputUrlsRaw}
                  onChange={(event) => setInputUrlsRaw(event.target.value)}
                  placeholder="Input image URLs (one per line)"
                  className="mt-3 h-24 w-full rounded-lg border border-white/10 bg-[#0b1427] p-3 text-xs"
                />
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-[#111a30] p-3">
              <p className="mb-2 text-xs text-zinc-400">Task Controls</p>
              <input
                type="text"
                value={taskId}
                onChange={(event) => setTaskId(event.target.value)}
                placeholder="task_id"
                className="w-full rounded-lg border border-white/10 bg-[#0b1427] px-2 py-2 text-xs"
              />
              <input
                type="text"
                value={callbackUrl}
                onChange={(event) => setCallbackUrl(event.target.value)}
                placeholder="optional callback URL"
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b1427] px-2 py-2 text-xs"
              />
              <button
                onClick={() => void checkTaskStatus()}
                className="mt-2 w-full rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5 disabled:opacity-50"
                disabled={loading || !taskId.trim()}
              >
                Check Status
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111a30] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-zinc-300">{statusText}</p>
              <span className="text-xs text-zinc-500">Aspect {aspectRatio}</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1427]">
              {currentImageUrl ? (
                <Image
                  src={currentImageUrl}
                  alt="Generated result"
                  width={1200}
                  height={800}
                  className="h-[420px] w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-[420px] items-center justify-center text-sm text-zinc-500">
                  Your generated image appears here after task success.
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => void generateImageTask()}
                className="rounded-lg border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5"
                disabled={loading}
              >
                Regenerate
              </button>
              <button className="rounded-lg border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5">
                Edit Prompt
              </button>
              <button className="rounded-lg border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5">
                Upscale
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111a30] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-200">Recent Generations</h2>
              <span className="text-xs text-zinc-500">Top 8</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {recentImages.length > 0 ? (
                recentImages.map((imageUrl) => (
                  <button
                    key={imageUrl}
                    onClick={() => setCurrentImageUrl(imageUrl)}
                    className="overflow-hidden rounded-lg border border-white/10 transition hover:border-violet-400/50"
                  >
                    <Image
                      src={imageUrl}
                      alt="Recent generation"
                      width={320}
                      height={240}
                      className="h-28 w-full object-cover"
                      unoptimized
                    />
                  </button>
                ))
              ) : (
                <div className="col-span-full rounded-lg border border-dashed border-white/15 p-6 text-center text-xs text-zinc-500">
                  No generated images yet.
                </div>
              )}
            </div>
          </div>

          <details className="rounded-xl border border-white/10 bg-[#111a30] p-3">
            <summary className="cursor-pointer text-xs text-zinc-300">Debug response</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0b1427] p-3 text-[11px] text-zinc-300">
              {output}
            </pre>
          </details>

          <footer className="text-center text-xs text-zinc-500">
            Personal GPT 2 Image Generator · Powered by Kie API
          </footer>
        </section>
      </div>

    </main>
  );
}
