import bundledPackages from '../data/vendors.json' with { type: 'json' };
import { extractVendors } from './stdlib-extractor.ts';
import { buildPackage, type StdlibPackage, type StdlibDocItem } from './stdlib';

const descriptions: Record<string, string> = {
  'vendors.fmod': 'Bindings for FMOD Core and Studio audio APIs, including sounds, channels, DSP, banks, and events.',
  'vendors.raylib': 'Bindings for raylib windowing, drawing, input, textures, fonts, 3D models, and audio.',
  'vendors.stb_truetype': 'Native Chic font parsing, glyph metrics, outlines, rasterization, and atlas packing based on stb_truetype.',
};

let vendorPackages: StdlibPackage[] | null = null;

export function getVendorPackages(): StdlibPackage[] {
  if (vendorPackages) return vendorPackages;
  const packages = process.env.CHIC_SOURCE_DIR
    ? extractVendors(process.env.CHIC_SOURCE_DIR).packages
    : bundledPackages as Array<{ name: string; items: StdlibDocItem[] }>;
  vendorPackages = packages.map(({ name, items }) => ({
    ...buildPackage(name, items, descriptions[name]),
    slug: name.replace(/^vendors\./, '').replaceAll('.', '/'),
  })).sort((a, b) => a.name.localeCompare(b.name));
  return vendorPackages;
}
