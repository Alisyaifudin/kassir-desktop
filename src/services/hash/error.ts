import { BaseError } from "~/lib/error-effect";

export class HashError extends BaseError("HashError") {}
export class InvalidPassword extends BaseError("InvalidPassword") {}