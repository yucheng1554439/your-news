import Image from "next/image";

const OPTIMIZED_HOST = "images.unsplash.com";

interface StoryImageProps {
  src: string;
  alt?: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function StoryImage({
  src,
  alt = "",
  fill = true,
  className,
  sizes,
  priority,
}: StoryImageProps) {
  let hostname = "";
  try {
    hostname = new URL(src).hostname;
  } catch {
    hostname = "";
  }

  const useNextImage = hostname === OPTIMIZED_HOST;

  if (useNextImage) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        className={className}
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={
        fill
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }
          : undefined
      }
    />
  );
}
