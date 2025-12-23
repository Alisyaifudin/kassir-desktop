import { tryResult } from "~/lib/utils";
import { getDB } from "../instance";
import { migration00000 } from "./00";
import EventEmitter from "eventemitter3";
import { migration00001 } from "./01";

async function run(event: EventEmitter) {
  const db = await getDB();
  const [errVer, res] = await tryResult({
    run: () => db.select<{ v: number }[]>("SELECT v FROM versions"),
  });
  if (errVer !== null) throw new Error(errVer);
  const versions = res.map((r) => r.v);
  if (versions.length === 0) {
    const mig = migration00000(db);
    mig.on("update", (percentage: number) => {
      event.emit("update", percentage);
    });
    mig.on("finish", () => {
      run(event);
    });
    return;
  } else if (versions[0] === 0) {
    const mig = migration00001(db);
    mig.on("update", (percentage: number) => {
      event.emit("update", percentage);
    });
    mig.on("finish", () => {
      run(event);
    });
    return;
  }
  event.emit("finish");
}

export function migration() {
  const event = new EventEmitter();
  run(event);
  return event;
}
