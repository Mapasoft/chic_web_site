import bundledPackages from '../data/platform.json' with { type: 'json' };
import { extractPlatform } from './stdlib-extractor.ts';
import { buildPackage, type StdlibPackage, type StdlibDocItem } from './stdlib';

const descriptions: Record<string, string> = {
  'platform.macos.appkit': 'macOS application, window, view, event, menu, button, and file dialog wrappers.',
  'platform.macos.core': 'Objective-C runtime objects, selectors, allocation, and reference management.',
  'platform.macos.coreanimation': 'Metal-backed Core Animation layers and drawable management.',
  'platform.macos.dispatch': 'Grand Central Dispatch semaphore, timing, and reference management bindings.',
  'platform.macos.foundation': 'Foundation strings, arrays, URLs, errors, data, dictionaries, and autorelease pools.',
  'platform.macos.metal': 'Metal devices, buffers, textures, shaders, render pipelines, and command encoding.',
  'platform.macos.metalkit': 'MetalKit view configuration and rendering resources.',
  'platform.macos.renderer': 'A Metal 2D renderer for Chic UI geometry, drawing commands, and font atlases.',
};
let platformPackages: StdlibPackage[] | null = null;
export function getPlatformPackages(): StdlibPackage[] {
  if (platformPackages) return platformPackages;
  const packages = process.env.CHIC_SOURCE_DIR
    ? extractPlatform(process.env.CHIC_SOURCE_DIR).packages
    : bundledPackages as Array<{ name: string; items: StdlibDocItem[] }>;
  platformPackages = packages.filter(({ items }) => items.length > 0).map(({ name, items }) => ({
    ...buildPackage(name, items, descriptions[name]),
    slug: name.replace(/^platform\./, '').replaceAll('.', '/'),
  })).sort((a, b) => a.name.localeCompare(b.name));
  return platformPackages;
}
