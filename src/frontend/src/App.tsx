import { RouterProvider, createRouter } from "@tanstack/react-router";
import { Outlet, createRootRoute, createRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { Layout } from "./components/Layout";
import { useInitData } from "./hooks/useInitData";

const TodayPage = lazy(() => import("./pages/Today"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const ClientsPage = lazy(() => import("./pages/Clients"));
const ServicesPage = lazy(() => import("./pages/Services"));
const SettingsPage = lazy(() => import("./pages/Settings"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// RootLayout defined outside createRootRoute to prevent inline function
// recreating the component on every render — avoids useInitData remount loops.
function RootLayout() {
  useInitData();
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <TodayPage />
    </Suspense>
  ),
});

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <CalendarPage />
    </Suspense>
  ),
});

const calendarDayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar/day",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <CalendarPage />
    </Suspense>
  ),
});

const calendarWeekRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar/week",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <CalendarPage />
    </Suspense>
  ),
});

const calendarMonthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar/month",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <CalendarPage />
    </Suspense>
  ),
});

const calendarAgendaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar/agenda",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <CalendarPage />
    </Suspense>
  ),
});

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clients",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ClientsPage />
    </Suspense>
  ),
});

const servicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/services",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ServicesPage />
    </Suspense>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <SettingsPage />
    </Suspense>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  calendarRoute,
  calendarDayRoute,
  calendarWeekRoute,
  calendarMonthRoute,
  calendarAgendaRoute,
  clientsRoute,
  servicesRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
