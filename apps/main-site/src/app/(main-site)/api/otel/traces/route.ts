import { type NextRequest, NextResponse } from "next/server";

const OTEL_PROXY_TARGET =
	process.env.OTEL_COLLECTOR_PROXY_TARGET ?? "http://127.0.0.1:4318/v1/traces";
const OTEL_PROXY_AUTH_TOKEN = process.env.OTEL_PROXY_AUTH_TOKEN ?? "";
const MAX_TRACE_PAYLOAD_BYTES = 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set<string>([
	"application/json",
	"application/x-protobuf",
	"application/protobuf",
]);

export async function POST(request: NextRequest) {
	if (OTEL_PROXY_AUTH_TOKEN.length === 0) {
		if (process.env.NODE_ENV === "production") {
			return new NextResponse("Tracing proxy is not configured", {
				status: 503,
			});
		}
	} else {
		const authorization = request.headers.get("authorization");
		if (authorization !== `Bearer ${OTEL_PROXY_AUTH_TOKEN}`) {
			return new NextResponse("Unauthorized", { status: 401 });
		}
	}

	const contentTypeHeader =
		request.headers.get("content-type") ?? "application/json";
	const normalizedContentType = contentTypeHeader
		.split(";")
		.at(0)
		?.trim()
		.toLowerCase();
	if (
		normalizedContentType === undefined ||
		!ALLOWED_CONTENT_TYPES.has(normalizedContentType)
	) {
		return new NextResponse("Unsupported content type", { status: 415 });
	}

	const contentLengthHeader = request.headers.get("content-length");
	if (contentLengthHeader !== null) {
		const contentLength = Number(contentLengthHeader);
		if (
			!Number.isFinite(contentLength) ||
			contentLength > MAX_TRACE_PAYLOAD_BYTES
		) {
			return new NextResponse("Payload too large", { status: 413 });
		}
	}

	const body = await request.text();
	if (new TextEncoder().encode(body).length > MAX_TRACE_PAYLOAD_BYTES) {
		return new NextResponse("Payload too large", { status: 413 });
	}

	const response = await fetch(OTEL_PROXY_TARGET, {
		method: "POST",
		headers: {
			"content-type": normalizedContentType,
		},
		body,
		cache: "no-store",
	}).catch(() => null);

	if (response === null) {
		return new NextResponse("Upstream collector unavailable", { status: 502 });
	}

	const responseBody = await response.text();
	const responseContentType =
		response.headers.get("content-type") ?? "application/json";

	return new NextResponse(responseBody, {
		status: response.status,
		headers: {
			"content-type": responseContentType,
		},
	});
}
