import { useEffect, useMemo, useState } from 'react'
import { thumbnailCandidatesForVideo } from '../../lib/constants'

export function AutoThumbnail({
  video,
  alt = '',
  className,
  style,
  fallback = null,
  referrerPolicy = 'no-referrer',
  loading = 'lazy',
  fetchPriority,
}) {
  const candidates = useMemo(
    () => thumbnailCandidatesForVideo(video),
    [video?.thumbnail, video?.href]
  )
  const [src, setSrc] = useState('')

  useEffect(() => {
    let cancelled = false
    let activeImage = null

    setSrc('')

    function tryCandidate(index) {
      const candidate = candidates[index]
      if (!candidate) return

      const image = new Image()
      activeImage = image
      image.decoding = 'async'
      image.referrerPolicy = referrerPolicy
      image.onload = () => {
        if (cancelled) return

        const isYoutubePlaceholder = candidate.includes('ytimg.com') && (
          image.naturalWidth <= 160 || image.naturalHeight <= 100
        )
        if (isYoutubePlaceholder) {
          tryCandidate(index + 1)
          return
        }

        setSrc(candidate)
      }
      image.onerror = () => {
        if (!cancelled) tryCandidate(index + 1)
      }
      image.src = candidate
    }

    tryCandidate(0)

    return () => {
      cancelled = true
      if (activeImage) {
        activeImage.onload = null
        activeImage.onerror = null
      }
    }
  }, [candidates, referrerPolicy])

  if (!src) return fallback

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy={referrerPolicy}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      onError={() => {
        setSrc('')
      }}
    />
  )
}
