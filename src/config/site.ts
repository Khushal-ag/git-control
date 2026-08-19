const baseUrl =
  (
    typeof process.env.NEXT_PUBLIC_SITE_URL === "string" &&
    process.env.NEXT_PUBLIC_SITE_URL.length > 0
  ) ?
    process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  : "https://git-control.khushalagarwal.dev";

export const siteConfig = {
  name: "GitControl & Playground",
  shortName: "GitControl",
  description:
    "An interactive simulator that visualizes Git concepts through live actions, animations, and a simulated terminal.",
  url: baseUrl,

  authors: [
    { name: "Khushal Agarwal", url: "https://portfolio.khushalagarwal.dev" },
  ],

  creator: "Khushal Agarwal",
  publisher: "Khushal Agarwal",

  keywords: [
    "git",
    "git learning",
    "git simulation",
    "git visualizer",
    "gitcontrol",
    "git branches",
    "rebase",
    "merge conflict",
    "cherry-pick",
    "reflog",
  ],

  twitter: {
    handle: "@starkhush",
    site: "@starkhush",
  },

  ogImage: `${baseUrl}/og.png`,

  robots: {
    index: true,
    follow: true,
  },
};
