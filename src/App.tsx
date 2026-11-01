import { useState } from "react";
import { createBrowserRouter, Link, Navigate, RouterProvider, useLocation } from "react-router";
import { LandingPage } from "./pages/LandingPage.tsx";
import { appPaths } from "./routes.ts";

function LegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate replace to={`${appPaths.home}${pathname}${search}${hash}`} />;
}

function PublicNotFound() {
  return <main className="p-10"><h1 className="text-3xl">Page not found</h1><p className="my-4">That address is not part of Miso.</p><Link to="/" className="underline">Back to Miso</Link></main>;
}

function AppLoading() {
  return <main className="grid min-h-dvh place-items-center bg-canvas"><p role="status">Opening Miso…</p></main>;
}

export function App() {
  const [router] = useState(() => createBrowserRouter([
    { path: "/", Component: LandingPage },
    { path: "/app/*", lazy: () => import("./Application.tsx"), HydrateFallback: AppLoading },
    ...["learn", "study", "miso", "shop", "stats", "settings", "courses/:courseId", "courses/:courseId/units/:unitId"].map(path => ({ path: `/${path}`, Component: LegacyRedirect })),
    { path: "*", Component: PublicNotFound },
  ]));
  return <RouterProvider router={router} />;
}
