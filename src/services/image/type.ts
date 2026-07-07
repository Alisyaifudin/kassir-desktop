
// export type Image = {
//   id: string;
//   name: string;
//   mime: DBNamespace.Mime;
//   order: number;
//   hash?: string;
// };

export type ImageResult =
  | {
      success: true;
      href: string;
      order: number;
      id: string;
    }
  | {
      success: false;
      order: number;
      href: undefined;
      id: string;
    };