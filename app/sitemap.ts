
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://task-manager-ten-lemon-83.vercel.app/",
      lastModified: new Date(),
    },
  ];
}
