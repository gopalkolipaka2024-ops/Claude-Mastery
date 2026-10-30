import { DEFS } from "@/components/PackageArtDefs";
import { packageArt } from "./package-art";
import type { ArtInput } from "./catalog";

/* A package drawing as a self-contained SVG file (own namespace, styles and gradients), for use
   as an image. Images can't use the page's web fonts; labels use condensed system fonts and are
   already stretched to fit. Animations are turned off. */
const STYLE = `<style>.lb,.ls{font-family:'Arial Narrow','Roboto Condensed','Helvetica Neue',Arial,sans-serif;font-weight:800;font-stretch:condensed}.ls{font-style:italic}.lt,.lsr{font-family:'Helvetica Neue',Roboto,Arial,sans-serif;font-weight:700}.sweep,.drip,.bub{display:none}</style>`;

export const standaloneArt = (a: ArtInput) =>
  packageArt(a).replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" `).replace(/(<svg[^>]*>)/, `$1${STYLE}${DEFS}`);
