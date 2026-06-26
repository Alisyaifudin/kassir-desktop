import { Context } from "effect";

export type User = {
  id: string;
  name: string;
  role: "admin" | "user";
};

type UserType = {
  readonly useUser: () => User;
  readonly user?: User;
  setUser: (user: User) => void;
};
export class UserService extends Context.Tag("UserService")<UserService, UserType>() {}
