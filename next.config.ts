import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // Provide a browser shim for '@react-native-async-storage/async-storage'
    // so transitive React Native imports (e.g. @metamask/sdk) don't break
    // or warn during web bundling. The shim implements a minimal async
    // storage API backed by window.localStorage.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": path.resolve(
        __dirname,
        "src/shims/async-storage.ts"
      ),
    };

    return config;
  },
};

export default nextConfig;
