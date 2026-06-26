import { Context } from "effect";
import { RecordDb } from "./record";

export type DBType = {
  readonly record: RecordDb;
};

export class DBService extends Context.Tag("DBService")<DBService, DBType>() {}
