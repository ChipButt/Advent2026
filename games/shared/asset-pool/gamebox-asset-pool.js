const MANIFEST_URL = new URL('./manifest.json', import.meta.url);
let manifestPromise = null;

export function getManifestUrl() {
  return MANIFEST_URL.href;
}

export async function getAssetManifest({ refresh = false } = {}) {
  if (refresh || !manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL, { cache: refresh ? 'no-store' : 'default' })
      .then(response => {
        if (!response.ok) throw new Error(`GameBox asset manifest failed: ${response.status}`);
        return response.json();
      });
  }
  return manifestPromise;
}

export async function getAsset(id) {
  const manifest = await getAssetManifest();
  return manifest.assets.find(asset => asset.id === id) || null;
}

export async function listAssets(filters = {}) {
  const manifest = await getAssetManifest();
  const search = String(filters.search || '').trim().toLowerCase();

  return manifest.assets.filter(asset => {
    if (filters.pack && asset.pack !== filters.pack) return false;
    if (filters.type && asset.type !== filters.type) return false;
    if (typeof filters.animated === 'boolean' && asset.animated !== filters.animated) return false;
    if (filters.format && asset.format !== filters.format) return false;
    if (search) {
      const haystack = [
        asset.id,
        asset.name,
        asset.filename,
        asset.pack,
        asset.packTitle,
        asset.type,
      ].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function assetUrl(assetOrPath) {
  const path = typeof assetOrPath === 'string' ? assetOrPath : assetOrPath?.path;
  if (!path) throw new Error('GameBox asset path is required');
  return new URL(path, MANIFEST_URL).href;
}

function loadWith(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

export async function loadThreeAsset(id, options = {}) {
  const asset = await getAsset(id);
  if (!asset) throw new Error(`Unknown GameBox asset: ${id}`);

  const url = assetUrl(asset);

  if (asset.format === 'gltf') {
    const loader = options.gltfLoader
      || (options.GLTFLoader ? new options.GLTFLoader(options.manager) : null);
    if (!loader) {
      throw new Error(
        'GLTFLoader is required for this asset. Pass { GLTFLoader } or { gltfLoader }.'
      );
    }
    const gltf = await loadWith(loader, url);
    return {
      asset,
      url,
      object: gltf.scene || gltf.scenes?.[0] || null,
      scenes: gltf.scenes || [],
      animations: gltf.animations || [],
      raw: gltf,
    };
  }

  if (asset.format === 'fbx') {
    const loader = options.fbxLoader
      || (options.FBXLoader ? new options.FBXLoader(options.manager) : null);
    if (!loader) {
      throw new Error(
        'FBXLoader is required for this asset. Pass { FBXLoader } or { fbxLoader }.'
      );
    }
    const object = await loadWith(loader, url);
    return {
      asset,
      url,
      object,
      scenes: [object],
      animations: object.animations || [],
      raw: object,
    };
  }

  throw new Error(`Unsupported GameBox asset format: ${asset.format}`);
}

export async function loadAssetSet(ids, options = {}) {
  return Promise.all(ids.map(id => loadThreeAsset(id, options)));
}
