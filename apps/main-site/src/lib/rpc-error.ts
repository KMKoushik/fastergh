import { Either, Schema } from "effect";

const ErrorTagSchema = Schema.Struct({
	_tag: Schema.String,
});

const ErrorMessageSchema = Schema.Struct({
	message: Schema.String,
});

const ErrorReasonSchema = Schema.Struct({
	reason: Schema.String,
});

const DefectNamedSchema = Schema.Struct({
	name: Schema.String,
	message: Schema.optional(Schema.String),
});

const DefectMessageSchema = Schema.Struct({
	message: Schema.String,
});

const RpcDefectErrorSchema = Schema.Struct({
	_tag: Schema.Literal("RpcDefectError"),
	defect: Schema.Union(Schema.String, DefectNamedSchema, DefectMessageSchema),
});

const decodeErrorTag = Schema.decodeUnknownEither(ErrorTagSchema);
const decodeErrorMessage = Schema.decodeUnknownEither(ErrorMessageSchema);
const decodeErrorReason = Schema.decodeUnknownEither(ErrorReasonSchema);
const decodeRpcDefectError = Schema.decodeUnknownEither(RpcDefectErrorSchema);

export const extractErrorTag = <A>(error: A): string | null => {
	const decoded = decodeErrorTag(error);
	if (Either.isLeft(decoded)) return null;
	return decoded.right._tag;
};

export const extractErrorMessage = <A>(error: A): string | null => {
	const decoded = decodeErrorMessage(error);
	if (Either.isLeft(decoded)) return null;
	return decoded.right.message.length > 0 ? decoded.right.message : null;
};

export const extractErrorReason = <A>(error: A): string | null => {
	const decoded = decodeErrorReason(error);
	if (Either.isLeft(decoded)) return null;
	return decoded.right.reason.length > 0 ? decoded.right.reason : null;
};

export const extractRpcDefectMessage = <A>(error: A): string | null => {
	const decoded = decodeRpcDefectError(error);
	if (Either.isLeft(decoded)) return null;

	const { defect } = decoded.right;
	if (typeof defect === "string") {
		return defect.length > 0 ? defect : null;
	}

	if ("name" in defect) {
		const detail = defect.message ?? "";
		return detail.length > 0
			? `${defect.name}: ${detail}`
			: `Server error: ${defect.name}`;
	}

	return defect.message.length > 0 ? defect.message : null;
};
