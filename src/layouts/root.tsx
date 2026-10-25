import { useLayoutEffect } from "react";
import { Outlet } from "react-router";
import type { Size } from "~/services/config";
import { service } from "~/services";
import { Loader, useStream } from "~/components/Loader";

/** Applies a size to the DOM (`<body>` class drives the `small:` variants). */
function applySize(size: Size) {
  document.body.classList.toggle("small", size === "small");
}

export default function Layout() {
  const size = useStream(service.config.size.changes);
  return (
    <Loader res={size}>
      {({ data }) => (
        <>
          <ApplySize size={data} />
          <Outlet />
        </>
      )}
    </Loader>
  );
}

function ApplySize({ size }: { size: Size }) {
  // Layout effect so the class lands before paint (no size flicker).
  useLayoutEffect(() => {
    applySize(size);
  }, [size]);
  return null;
}
