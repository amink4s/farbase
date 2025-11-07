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
          h1: ({ node: _node, ...props }) => <h1 className={styles.h1} {...props} />,
          h2: ({ node: _node, ...props }) => <h2 className={styles.h2} {...props} />,
          h3: ({ node: _node, ...props }) => <h3 className={styles.h3} {...props} />,
          p: ({ node: _node, ...props }) => <p className={styles.p} {...props} />,
          a: ({ node: _node, ...props }) => <a className={styles.a} {...props} />,
          ul: ({ node: _node, ...props }) => <ul className={styles.ul} {...props} />,
          li: ({ node: _node, ...props }) => <li className={styles.li} {...props} />,
          code: ({ node: _node, ...props }) => <code className={styles.code} {...props} />,
          text: ({ node: _node, ...props }) => {
            const text = props.children as string;
            const mentionRegex = /@(\w+)/g;
            const parts = text.split(mentionRegex);

            return (
              <>
                {parts.map((part, i) =>
                  mentionRegex.test(part) ? (
                    <Mention key={i}>{part}</Mention>
                  ) : (
                    part
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
