import React from 'react';

const BRAND_SOURCE = 'https://media.base44.com/images/public/69c7cb9079c969283e11e46c/a56617cb0_image.png';

export default function DeskInkLogo({ className = '' }) {
  return (
    <div role="img" aria-label="DeskInk" className={`relative shrink-0 overflow-hidden ${className}`}>
      <img
        src={BRAND_SOURCE}
        alt=""
        aria-hidden="true"
        className="absolute left-[-464px] top-[-151px] h-[576px] w-[1024px] max-w-none"
      />
    </div>
  );
}