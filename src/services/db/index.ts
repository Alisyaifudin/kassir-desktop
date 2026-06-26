import { Context } from "effect";
import { RecordDb } from "./record";
import { BaseError } from "~/lib/error-effect";

export type DBType = {
  readonly record: RecordDb;
};

export class DBService extends Context.Tag("DBService")<DBService, DBType>() {}

export class DbError extends BaseError("DbError") {}
