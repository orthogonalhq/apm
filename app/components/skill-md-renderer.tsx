import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

export function SkillMdRenderer({ content }: { content: string }) {
  const body = content.replace(/^---[\s\S]*?---\s*/, "");

  return (
    <div className="prose prose-invert prose-sm max-w-none prose-headings:font-mono prose-headings:font-semibold prose-headings:t-heading prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-[0.08em] prose-h3:text-xs prose-h3:uppercase prose-h3:tracking-[0.06em] prose-p:text-[13px] prose-p:t-card-desc prose-p:leading-relaxed prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-strong:text-fg/85 prose-code:text-accent/80 prose-code:bg-white/[0.04] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-[3px] prose-code:text-xs prose-code:font-mono prose-code:border prose-code:border-white/[0.08] prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-white/[0.04] prose-pre:border prose-pre:border-white/[0.08] prose-pre:rounded-[3px] prose-blockquote:border-l-accent prose-blockquote:text-fg/45 prose-li:text-[13px] prose-li:t-card-desc prose-hr:border-white/[0.06]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
