
import type { NextConfig } from "next";

const repository = process.env.GITHUB_REPOSITORY?.split("/");
const owner = repository?.[0];
const repo = repository?.[1];

const isUserSite = repo === `${owner}.github.io`;

const basePath =
  process.env.GITHUB_ACTIONS === "true" &&
  repo &&
  !isUserSite
    ? `/${repo}`
    : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
