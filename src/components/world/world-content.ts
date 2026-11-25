/**
 * Content for the ImmXrsive World (/world).
 *
 * Every entry here is either real, approved content or an explicit "coming soon" slot.
 * Nothing is invented: unknown projects and students show a placeholder instead of copy.
 * The 3D engine and the accessible list view both render from this single source.
 */

export type PlaceId = "hub" | "queen" | "stories" | "showcase" | "dock" | "launchpad";

export type WorldLink = { label: string; href: string; external?: boolean };

export type StoryCard =
  | { kind: "student"; name: string; role: string; initials: string; photo?: string; href?: string }
  | { kind: "coming-soon" };

export type ShowcaseCard =
  | { kind: "project"; name: string; summary?: string; tags: string[]; href?: string }
  | { kind: "coming-soon" };

export type Place = {
  id: PlaceId;
  /** Short name shown on the floating label in the world. */
  name: string;
  kicker: string;
  title: string;
  body: string;
  /** Position on the planet: latitude/longitude in degrees (north pole = 90). */
  lat: number;
  lon: number;
  links: WorldLink[];
  stories?: StoryCard[];
  showcase?: ShowcaseCard[];
};

export const WORLD_TITLE = "ImmXrsive World";
/** The Stories House shelf (adapted ThreeUI Complete Shelf, see docs/design/immxrsive-world.md). */
export const STORIES_SHELF_URL = "/world/stories-shelf.html";

export const places: readonly Place[] = [
  {
    id: "hub",
    name: "The X",
    kicker: "Start here",
    title: "Step into ImmXrsive.",
    body: "ImmXrsive is the National Centre of Excellence for Immersive Technology at Algoma University. This little world is a quick tour of the people, the work and the ways to get involved. Fly to any building to explore.",
    lat: 90,
    lon: 0,
    links: [{ label: "Open the main site", href: "/" }],
  },
  {
    id: "queen",
    name: "24 Queen St E",
    kicker: "Algoma University · Brampton",
    title: "Our home in downtown Brampton.",
    body: "Algoma University's Brampton campus sits at 24 Queen Street East, in the heart of downtown beside Garden Square. It's where the platform and many of these projects started.",
    lat: 38,
    lon: 0,
    links: [{ label: "Algoma University", href: "https://algomau.ca", external: true }],
  },
  {
    id: "stories",
    name: "Stories House",
    kicker: "Student stories",
    title: "The people behind the work.",
    body: "Students share what they built, what they learned and where it took them.",
    lat: 40,
    lon: 72,
    links: [{ label: "Meet all talent", href: "/talent" }],
    stories: [
      {
        kind: "student",
        name: "Jash Sojitra",
        role: "Developer of this platform · XR Program & Partnership Student Coordinator",
        initials: "JS",
        photo: "/world/students/jash-sojitra.jpg",
        href: "https://www.linkedin.com/in/jashsojitra/",
      },
      { kind: "coming-soon" },
      { kind: "coming-soon" },
    ],
  },
  {
    id: "showcase",
    name: "Showcase Lab",
    kicker: "Selected work",
    title: "Real projects, built by students.",
    body: "A few projects picked for the lab. More exhibits are being prepared.",
    lat: 36,
    lon: 144,
    links: [{ label: "Browse all projects", href: "/projects" }, { label: "XR showcase", href: "/showcase" }],
    showcase: [
      {
        kind: "project",
        name: "SYNC",
        summary: "Security workforce scheduling and dispatch, with a vision for XR training. 2026 hackathon grand-prize project.",
        tags: ["Software", "Operations", "XR vision"],
      },
      {
        kind: "project",
        name: "Canon DNA",
        summary: "A reuse-driven application design studio concept, built for a Canon hackathon challenge.",
        tags: ["Software", "Design systems"],
      },
      {
        kind: "project",
        name: "Project Nexus",
        summary: "An AI-assisted employee onboarding platform that turns a fragmented onboarding process into a smoother, more efficient start for new employees.",
        tags: ["AI", "Software", "Onboarding"],
      },
      { kind: "coming-soon" },
    ],
  },
  {
    id: "dock",
    name: "Industry Dock",
    kicker: "For industry",
    title: "Bring us a real problem.",
    body: "Partners work with students on authentic projects, demos and pilots. Start a conversation and we'll find the right people.",
    lat: 42,
    lon: -144,
    links: [{ label: "Industry partners", href: "/partners" }, { label: "Start an inquiry", href: "/contact" }],
  },
  {
    id: "launchpad",
    name: "Launchpad",
    kicker: "Join in",
    title: "Your work deserves an audience.",
    body: "Students can build a profile, publish projects and get discovered. Scan the code to open the platform on your phone.",
    lat: 38,
    lon: -72,
    links: [{ label: "Student sign in", href: "/student/sign-in" }, { label: "Discover talent", href: "/talent" }],
  },
];

export const placeById = (id: PlaceId) => places.find(place => place.id === id)!;

/** Order used by the guided tour. */
export const tourOrder: readonly PlaceId[] = ["hub", "queen", "stories", "showcase", "dock", "launchpad"];

/** Unit vector for a latitude/longitude pair, y-up. */
export function latLonToUnit(lat: number, lon: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lon * (Math.PI / 180);
  return [Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)];
}
