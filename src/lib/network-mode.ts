export type NetworkMode = "mainnet" | "demo";

export function getNetworkModeFromPathname(pathname: string): NetworkMode {
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    return "demo";
  }

  return "mainnet";
}

export function getModeSwitchTarget(pathname: string): string {
  if (pathname === "/demo") {
    return "/";
  }

  if (pathname.startsWith("/demo/")) {
    const withoutDemoPrefix = pathname.slice("/demo".length);
    return withoutDemoPrefix.length > 0 ? withoutDemoPrefix : "/";
  }

  if (pathname === "/") {
    return "/demo";
  }

  return `/demo${pathname}`;
}
