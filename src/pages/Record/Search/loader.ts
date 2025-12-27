import { data, LoaderFunctionArgs } from "react-router";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { db } from "~/database";
import { RecordProduct } from "~/database/record-product/get-history";
import { DefaultError, integer, ok, Result } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams;
  const { start, end, query } = getParams(search);
  const histories = getHistory(start, end, query);
  return data(histories);
}

async function getHistory(
  start: number,
  end: number,
  query: string
): Promise<Result<DefaultError, RecordProduct[]>> {
  if (query.trim() === "") return ok([]);
  return db.recordProduct.get.history(start, end, query);
}

export type Loader = typeof loader;

function getParams(search: URLSearchParams): {
  start: number;
  end: number;
  query: string;
} {
  const today = Temporal.Now.zonedDateTimeISO().startOfDay();
  const lastMonth = today.subtract(Temporal.Duration.from({ months: 1 }));
  const start = integer.catch(lastMonth.epochMilliseconds).parse(search.get("start"));
  const end = integer.catch(today.epochMilliseconds).parse(search.get("end"));
  const query = z.string().catch("").parse(search.get("query"));
  return { start, end, query };
}
