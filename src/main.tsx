import ReactDOM from "react-dom/client";
import {
  RouterProvider,
} from "react-router";
import "./global.css";
import { router } from "./route";

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
// );


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RouterProvider router={router} />
);