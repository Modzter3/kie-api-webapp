import { NextResponse } from "next/server";

const BASE_URL = "https://api.kie.ai";

type KieAction = "credit" | "request" | "status";

type KieBody = {
  action?: KieAction;
  endpoint?: string;
  method?: "GET" | "POST";
  payload?: unknown;
  taskId?: string;
};

function getApiKey() {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return {
      error: NextResponse.json(
        { error: "Missing KIE_API_KEY environment variable on server." },
        { status: 500 },
      ),
    };
  }
  return { apiKey };
}

function buildHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function POST(request: Request) {
  const { apiKey, error } = getApiKey();
  if (!apiKey) return error;

  const body = (await request.json()) as KieBody;
  const action = body.action;

  if (!action) {
    return NextResponse.json(
      { error: "Missing action. Use credit, request, or status." },
      { status: 400 },
    );
  }

  try {
    if (action === "credit") {
      const response = await fetch(`${BASE_URL}/api/v1/chat/credit`, {
        method: "GET",
        headers: buildHeaders(apiKey),
        cache: "no-store",
      });
      const data = await response.json();
      return NextResponse.json({ status: response.status, data });
    }

    if (action === "status") {
      if (!body.taskId) {
        return NextResponse.json(
          { error: "Missing taskId for status check." },
          { status: 400 },
        );
      }

      const response = await fetch(`${BASE_URL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(body.taskId)}`, {
        method: "GET",
        headers: buildHeaders(apiKey),
        cache: "no-store",
      });
      const data = await response.json();
      return NextResponse.json({ status: response.status, data });
    }

    const endpoint = body.endpoint?.trim();
    const method = body.method ?? "POST";

    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing endpoint for request action." },
        { status: 400 },
      );
    }

    if (!endpoint.startsWith("/")) {
      return NextResponse.json(
        { error: "Endpoint must start with '/'." },
        { status: 400 },
      );
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: buildHeaders(apiKey),
      ...(method === "POST" ? { body: JSON.stringify(body.payload ?? {}) } : {}),
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json({ status: response.status, data });
  } catch (requestError) {
    return NextResponse.json(
      {
        error: "Request to Kie API failed.",
        detail:
          requestError instanceof Error ? requestError.message : String(requestError),
      },
      { status: 500 },
    );
  }
}
