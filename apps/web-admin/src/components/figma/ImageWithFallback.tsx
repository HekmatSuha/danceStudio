import React, { useState } from 'react'
import Image, { type ImageProps } from 'next/image'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

type Props = Omit<ImageProps, 'src' | 'alt'> & {
  src?: ImageProps['src'];
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function ImageWithFallback(props: Props) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, width, height, fill, ...rest } = props
  const imageSrc = didError ? ERROR_IMG_SRC : src || ERROR_IMG_SRC
  const imageAlt = alt || 'Image'

  if (fill) {
    return (
      <div className={`relative ${className ?? ''}`} style={style}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          onError={handleError}
          {...rest}
        />
      </div>
    )
  }

  return (
    <Image
      src={imageSrc}
      alt={imageAlt}
      width={typeof width === 'number' ? width : 88}
      height={typeof height === 'number' ? height : 88}
      className={className}
      style={style}
      onError={handleError}
      {...rest}
    />
  )
}
