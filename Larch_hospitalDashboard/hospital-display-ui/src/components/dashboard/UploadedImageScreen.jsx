import React from 'react';
import { resolveAssetUrl } from '../../api/apiClient';

/**
 * Full-screen interstitial shown right after a safety-awareness message,
 * displaying one uploaded image edge-to-edge. Renders nothing if no image
 * is available for the current rotation slot.
 */
export default function UploadedImageScreen({ image }) {
  if (!image) return null;

  return (
    <div className="uploaded-image-screen">
      <img
        src={resolveAssetUrl(image.imageUrl)}
        alt=""
        className="uploaded-image-screen-img"
      />
    </div>
  );
}
