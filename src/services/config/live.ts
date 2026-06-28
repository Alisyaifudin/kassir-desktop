// function createLayer() {
//   const size = new DataState(getSize(), setSize);
//   const theme = new DataState(getTheme(), setTheme);
//   return ConfigService.of({
//     size: {
//       get: size.getSnapshot,
//       set: size.setData,
//       useSize: size.useData,
//     },
//     theme: {
//       get: theme.getSnapshot,
//       set: theme.setData,
//       useTheme: theme.useData,
//     },
//   });
// }
// const configLayer = Layer.succeed(ConfigService, createLayer());

// const SIZE_KEY = "kassir_size";
// const THEME_KEY = "kassir_theme";

// function getSize() {
//   const raw = localStorage.getItem(SIZE_KEY);
//   const size = z.enum(["small", "big"]).catch("big").parse(raw);
//   return size;
// }

// function setSize(size: Size) {
//   localStorage.setItem(SIZE_KEY, size);
// }

// function getTheme() {
//   const raw = localStorage.getItem(THEME_KEY);
//   const theme = z.enum(["dark", "light", "system"]).catch("system").parse(raw);
//   return theme;
// }

// function setTheme(theme: Theme) {
//   localStorage.setItem(THEME_KEY, theme);
// }