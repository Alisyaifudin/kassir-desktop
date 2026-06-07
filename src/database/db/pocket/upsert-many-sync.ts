// import { sqlx } from "~/database/sqlx";

import { Effect } from "effect";

type Input = {
  id: string;
  name: string;
  type: DB.PocketType;
  ordering: number;
  updatedAt: number;
  money: {
    id: string;
    timestamp: number;
    value: number;
    note: string;
    updatedAt: number;
  }[];
};

export function upsertManyPocketSync(
  pockets: Input[],
  now: number,
) {
  return Effect.gen(function*(){

  })
}

function upsertOnePocketSync(
  pockets: Input,
  now: number,
) {
  return Effect.gen(function*(){
    
  })
}