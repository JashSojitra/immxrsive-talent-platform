import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeImageUrl, youtubeId } from "./policy";

export function Markdown({ body }: { body: string }) {
  // Only a standalone HTTPS YouTube URL becomes an embed; raw HTML stays disabled.
  return <>{body.split(/(^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?[^\s]+|youtu\.be\/[^\s]+)\s*$)/m).map((part, index) => {
    const id = youtubeId(part.trim());
    return id ? <iframe key={index} src={`https://www.youtube-nocookie.com/embed/${id}`} title="YouTube video" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen style={{ width: "100%", aspectRatio: "16 / 9", border: 0 }} /> : <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} skipHtml components={{
      // eslint-disable-next-line @next/next/no-img-element
      img: ({ src, alt }) => typeof src === "string" && safeImageUrl(src) ? <img src={src} alt={alt || ""} loading="lazy" style={{ maxWidth: "100%" }} /> : null,
      a: ({ href, children }) => <a href={href} rel="noopener noreferrer">{children}</a>,
    }}>{part}</ReactMarkdown>;
  })}</>;
}
