export const SITE = {
  website: "https://lnara.com/",
  author: "Lawrence Nara",
  profile: "https://lnara.com/",
  desc: "Building things, thinking out loud",
  title: "Lawrence Nara",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: false, // Keep it simple - light mode only
  postPerIndex: 5, // Show 5 recent posts on homepage
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000,
  showArchives: true, // Enable archives for older posts
  showBackButton: true,
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "",
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "en",
  timezone: "UTC",
} as const;
