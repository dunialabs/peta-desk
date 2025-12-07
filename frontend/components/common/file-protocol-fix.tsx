'use client'

import { useEffect } from 'react'

/**
 * Fix absolute-path network requests under file:// protocol by rewriting
 * URLs that start with "/" to be relative ("./"). This helps Next.js
 * exported App Router pages load their RSC flight .txt files in Electron
 * without custom protocols.
 */
export function FileProtocolFix() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (location.protocol !== 'file:') return

    // Helper: rewrite absolute paths and bad file:/// root paths to be relative to current document
    const rewriteToRelativeUrlString = (inputUrl: string): string | null => {
      try {
        // Handle absolute paths - convert to relative
        if (inputUrl.startsWith('/')) {
          // Special handling for Next.js RSC flight data (.txt files)
          // These files are critical for App Router to work properly
          return '.' + inputUrl
        }
        
        // Handle file:/// URLs - these need to be relative to the current document
        if (inputUrl.startsWith('file:///')) {
          const filePath = inputUrl.replace('file:///', '')
          // If it's just a filename without path, make it relative
          if (!filePath.includes('/')) {
            return './' + filePath
          }
          // Map file:///xxx to ./xxx relative to current document
          return new URL('./' + filePath, location.href).toString()
        }
      } catch (e) {
        console.warn('FileProtocolFix: URL rewrite failed', e)
      }
      return null
    }

    // Patch fetch
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        let urlStr: string
        if (typeof input === 'string') {
          urlStr = input
        } else if (input instanceof URL) {
          urlStr = input.toString()
        } else {
          urlStr = (input as Request).url
        }

        const rewrittenStr = rewriteToRelativeUrlString(urlStr)
        if (rewrittenStr) {
          if (typeof input === 'string')
            return originalFetch(rewrittenStr, init)
          if (input instanceof URL)
            return originalFetch(new URL(rewrittenStr, location.href), init)
          return originalFetch(
            new Request(rewrittenStr, input as Request),
            init
          )
        }
      } catch {}
      return originalFetch(input as any, init)
    }

    // Patch XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      ...rest: any[]
    ) {
      try {
        if (typeof url === 'string') {
          const rewritten = rewriteToRelativeUrlString(url)
          if (rewritten) url = rewritten
        }
      } catch {}
      // @ts-expect-error - spread for XHR open args
      return originalOpen.call(this, method, url, ...rest)
    }

    // Rewrite absolute URLs in DOM elements (link/script/img) to relative
    const rewriteAbsoluteToRelative = (value: string | null | undefined) => {
      if (!value) return value
      try {
        if (value.startsWith('/')) return '.' + value
        if (value.startsWith('file:///'))
          return new URL(
            './' + value.replace('file:///', ''),
            location.href
          ).toString()
      } catch {}
      return value
    }

    const processElement = (el: Element) => {
      try {
        if (
          (el as HTMLLinkElement).href !== undefined &&
          el.hasAttribute('href')
        ) {
          const href = el.getAttribute('href')
          const rewritten = rewriteAbsoluteToRelative(href)
          if (rewritten && rewritten !== href)
            el.setAttribute('href', rewritten)
        }
        if (
          (el as HTMLScriptElement).src !== undefined &&
          el.hasAttribute('src')
        ) {
          const src = el.getAttribute('src')
          const rewritten = rewriteAbsoluteToRelative(src)
          if (rewritten && rewritten !== src) el.setAttribute('src', rewritten)
        }
        if (
          (el as HTMLImageElement).src !== undefined &&
          el.hasAttribute('src')
        ) {
          const src = el.getAttribute('src')
          const rewritten = rewriteAbsoluteToRelative(src)
          if (rewritten && rewritten !== src) el.setAttribute('src', rewritten)
        }
      } catch {}
    }

    const scanAndRewrite = () => {
      try {
        const candidates = document.querySelectorAll(
          'link[href], script[src], img[src]'
        )
        candidates.forEach((el) => processElement(el))
      } catch {}
    }

    // Initial scan after hydration
    scanAndRewrite()

    // Observe future DOM mutations to keep URLs corrected
    const observer = new MutationObserver((mutations) => {
      try {
        for (const m of mutations) {
          if (m.type === 'childList') {
            m.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                processElement(node as Element)
                const nested = (node as Element).querySelectorAll?.(
                  'link[href^="/"], script[src^="/"], img[src^="/"]'
                )
                nested?.forEach((el) => processElement(el))
              }
            })
          } else if (m.type === 'attributes' && m.target instanceof Element) {
            if (m.attributeName === 'href' || m.attributeName === 'src') {
              processElement(m.target)
            }
          }
        }
      } catch {}
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'src']
    })

    // Rewrite navigation APIs (history/location) to use relative paths
    const rewriteUrl = (url: any) => {
      try {
        if (typeof url === 'string' && url.startsWith('/')) return '.' + url
      } catch {}
      return url
    }

    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState
    history.pushState = function (
      data: any,
      title: string,
      url?: string | URL | null
    ) {
      return originalPushState.call(this, data, title, rewriteUrl(url as any))
    }
    history.replaceState = function (
      data: any,
      title: string,
      url?: string | URL | null
    ) {
      return originalReplaceState.call(
        this,
        data,
        title,
        rewriteUrl(url as any)
      )
    }

    // DO NOT override window.location methods directly (read-only in some envs)

    // Intercept anchor clicks created after hydration
    const clickHandler = (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement
        const anchor = target.closest(
          'a[href^="/"]'
        ) as HTMLAnchorElement | null
        if (anchor) {
          anchor.setAttribute('href', '.' + anchor.getAttribute('href'))
        }
      } catch {}
    }
    document.addEventListener('click', clickHandler, true)

    // Patch window.fetch for Request constructed later
    // No-op beyond above; kept minimal to avoid side-effects

    return () => {
      // Best-effort: cannot easily restore native methods in all cases
      try {
        observer.disconnect()
      } catch {}
      try {
        document.removeEventListener('click', clickHandler, true)
        history.pushState = originalPushState
        history.replaceState = originalReplaceState
      } catch {}
    }
  }, [])

  return null
}
