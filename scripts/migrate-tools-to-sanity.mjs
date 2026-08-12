#!/usr/bin/env node
// One-time (or re-runnable) bootstrap: creates/updates a "tool" Sanity
// document for each entry below, uploading its screenshot as a real image
// asset. Idempotent -- uses a deterministic _id per tool (`tool-<mount>`)
// and createOrReplace, so re-running it is safe and just re-syncs.
//
// Requires env vars (never hardcode these):
//   NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET
//   SANITY_API_WRITE_TOKEN  -- a write-capable token from the personal-site
//                              Vercel project's own env vars (or Sanity's
//                              own token management UI)
//
// Usage:
//   NEXT_PUBLIC_SANITY_PROJECT_ID=... NEXT_PUBLIC_SANITY_DATASET=production \
//   SANITY_API_WRITE_TOKEN=... node scripts/migrate-tools-to-sanity.mjs

import { createClient } from "@sanity/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID and/or SANITY_API_WRITE_TOKEN.");
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion: "2025-02-19", token, useCdn: false });

// Snapshot of the tools that were hardcoded in src/lib/tools.ts before this
// migration -- same content, just becoming the seed data for Sanity instead
// of a source of truth in code.
const TOOLS = [
  {
    mount: "allergy-locator",
    label: "Allergy Locator",
    description: "Pick your allergens, see where in the US is best or worst for you.",
    originUrl: "https://allergy-locator.vercel.app",
    repoUrl: "https://github.com/mdostal/allergy-locator",
    live: true,
    screenshotFile: "allergy-locator.png",
    sortOrder: 0,
  },
  {
    mount: "mapstack",
    label: "Mapstack",
    description: "Open-source US map layers -- pick datasets, overlay them, find what matters to you.",
    originUrl: "https://mapstack-us.vercel.app",
    repoUrl: "https://github.com/mdostal/mapstack-us",
    live: true,
    screenshotFile: "mapstack.png",
    sortOrder: 1,
  },
  {
    mount: "study-tracker",
    label: "Medical Study Tracker",
    description:
      "Ranks paid clinical-trial studies by net cash kept, cash velocity, and downtime -- not the headline \"up to $\" figure. Community-verified data, no accounts.",
    originUrl: "https://medical-study-tracker-seven.vercel.app",
    repoUrl: "https://github.com/mdostal/medical-study-tracker",
    pagesUrl: "https://mdostal.github.io/medical-study-tracker/",
    live: true,
    screenshotFile: "study-tracker.png",
    sortOrder: 2,
  },
  {
    mount: "framework",
    label: "Drone Components",
    description:
      "A shadcn-style component framework for drone property intelligence -- map layer viewer, 3D/point-cloud viewer, geo-anchored model overlay, video walkthrough player, Minecraft terrain voxelizer, and the tools around them. Demoed against real drone photogrammetry, not mockups.",
    originUrl: "https://drone-hub-rust.vercel.app",
    repoUrl: "https://github.com/mdostal/drone-hub",
    live: true,
    screenshotFile: "drone-hub.png",
    sortOrder: 3,
    components: [
      { label: "VideoTour", href: "/framework/components/video-tour" },
      { label: "LayerViewer", href: "/framework/components/layer-viewer" },
      { label: "Model3D", href: "/framework/components/model3d" },
      { label: "LandOverlay", href: "/framework/components/land-overlay" },
      { label: "VoxelTerrain", href: "/framework/components/voxel-terrain" },
      { label: "ContentEngine", href: "/framework/properties/2806-prado/engine" },
      { label: "FileUpload", href: "/framework/components/file-upload" },
      { label: "FileList", href: "/framework/components/file-list" },
      { label: "ProcessingStatus", href: "/framework/components/processing-status" },
      { label: "FlightCoverageAnalyzer", href: "/framework/components/flight-coverage-analyzer" },
      { label: "TourBuilder", href: "/framework/components/tour-builder" },
    ],
  },
];

for (const tool of TOOLS) {
  const screenshotPath = path.join(__dirname, "..", "public", "screenshots", tool.screenshotFile);
  const buffer = await readFile(screenshotPath);
  const asset = await client.assets.upload("image", buffer, { filename: tool.screenshotFile });

  const doc = {
    _id: `tool-${tool.mount}`,
    _type: "tool",
    label: tool.label,
    mount: { _type: "slug", current: tool.mount },
    description: tool.description,
    originUrl: tool.originUrl,
    repoUrl: tool.repoUrl,
    live: tool.live,
    hidden: false,
    sortOrder: tool.sortOrder,
    screenshot: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
  };
  if (tool.pagesUrl) doc.pagesUrl = tool.pagesUrl;
  if (tool.components) doc.components = tool.components;

  await client.createOrReplace(doc);
  console.log(`✓ ${tool.label} (${doc._id})`);
}

console.log("Done.");
