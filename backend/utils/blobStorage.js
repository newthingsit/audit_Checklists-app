/**
 * Azure Blob Storage utility for enterprise-grade file/photo storage.
 *
 * Why Azure Blob Storage?
 * - App Service filesystem is ephemeral; files are lost on deploy, restart, or scale.
 * - Blob Storage is durable, globally replicated, and scaled independently.
 * - CDN-friendly — direct public URLs without proxying through Node.
 *
 * Configuration (App Settings / .env):
 *   AZURE_STORAGE_CONNECTION_STRING  – required
 *   AZURE_STORAGE_CONTAINER_NAME     – optional (default: "audit-photos")
 *
 * Falls back to local filesystem when AZURE_STORAGE_CONNECTION_STRING is not set
 * (development mode).
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const logger = require('./logger');

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'audit-photos';

let _blobServiceClient = null;
let _containerClient = null;
let _initialized = false;
let _blobEnabled = false;

/**
 * Initialise the Azure Blob Storage client (idempotent).
 * Call once at startup; subsequent calls are no-ops.
 */
async function initBlobStorage() {
  if (_initialized) return _blobEnabled;

  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) {
    logger.warn('[BlobStorage] AZURE_STORAGE_CONNECTION_STRING not set – photos will use local filesystem (not recommended for production)');
    _initialized = true;
    _blobEnabled = false;
    return false;
  }

  try {
    _blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
    _containerClient = _blobServiceClient.getContainerClient(CONTAINER_NAME);

    // Create container if it doesn't exist (public read access for blobs)
    await _containerClient.createIfNotExists({ access: 'blob' });

    _initialized = true;
    _blobEnabled = true;
    logger.info(`[BlobStorage] Initialized — container "${CONTAINER_NAME}" ready`);
    return true;
  } catch (err) {
    logger.error('[BlobStorage] Initialization failed:', err.message);
    _initialized = true;
    _blobEnabled = false;
    return false;
  }
}

/**
 * Upload a buffer to Azure Blob Storage.
 *
 * @param {Buffer} buffer  – file contents
 * @param {string} blobName – target blob name (e.g. "audit-17719962…jpg")
 * @param {string} [contentType='image/jpeg']
 * @returns {Promise<string>} – public URL of the uploaded blob
 */
async function uploadBlob(buffer, blobName, contentType = 'image/jpeg') {
  if (!_blobEnabled || !_containerClient) {
    throw new Error('Blob storage is not initialized');
  }

  const blockBlobClient = _containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType,
      blobCacheControl: 'public, max-age=86400', // CDN/browser cache 1 day
    },
    // Overwrite if exists (idempotent re-upload)
    overwriteExisting: true,
  });

  return blockBlobClient.url; // Public URL like https://<account>.blob.core.windows.net/<container>/<blob>
}

/**
 * Delete a blob from storage (best-effort, does not throw on 404).
 *
 * @param {string} blobName – blob name
 */
async function deleteBlob(blobName) {
  if (!_blobEnabled || !_containerClient) return;

  try {
    await _containerClient.getBlockBlobClient(blobName).deleteIfExists();
  } catch (err) {
    logger.warn(`[BlobStorage] Failed to delete blob "${blobName}":`, err.message);
  }
}

/**
 * Check if blob storage is enabled and ready.
 */
function isBlobEnabled() {
  return _blobEnabled;
}

/**
 * Get the public base URL for the container (for constructing URLs externally).
 */
function getContainerUrl() {
  if (!_containerClient) return null;
  return _containerClient.url;
}

module.exports = {
  initBlobStorage,
  uploadBlob,
  deleteBlob,
  isBlobEnabled,
  getContainerUrl,
};
