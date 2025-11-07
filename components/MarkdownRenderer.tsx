"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownRenderer.module.css';

interface MarkdownRendererProps {
  content: string;
}

// Custom component to render @mentions as links
const Mention = ({ children }: { children: React.ReactNode }) => {
  const username = React.Children.toArray(children)[0]?.toString().substring(1);
  if (!username) return <>{children}</>;
  
  const profileUrl = `https://warpcast.com/${username}`;
  
  return (
    <a href={profileUrl} target="_blank" rel="noopener noreferrer" className={styles.mentionLink}>
      @{username}
    </a>
  );
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className={styles.markdownContainer}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => <a className={styles.link} {...props} />,
          p: ({ node, ...props }) => <p className={styles.paragraph} {...props} />,
          // Custom handling for @mentions
          text: ({ node, ...props }) => {
            const text = props.children as string;
            const mentionRegex = /(@[a-zA-Z0-9_.-]+)/g;
            const parts = text.split(mentionRegex);

            return (
              <>
                {parts.map((part, i) =>
                  mentionRegex.test(part) ? (
                    <Mention key={i}>{part}</Mention>
                  ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                  )
                )}
              </>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
