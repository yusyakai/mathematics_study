import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// テキスト中の $...$ を数式としてレンダリングするコンポーネント
// 例: "x² + y² = (x+y)² − 2xy" → そのまま表示
// 例: "$x^2 + y^2 = (x+y)^2 - 2xy$" → KaTeXでレンダリング
//
// 問題データで数式を使う場合は $...$ で囲んでください

export default function MathText({ text, className }) {
  const html = useMemo(() => {
    if (!text) return '';

    // $...$ パターンを検出してKaTeXに変換
    const parts = text.split(/(\$[^$]+\$)/g);

    return parts.map(part => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        try {
          return katex.renderToString(math, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          return part;
        }
      }
      // HTMLエスケープ
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }).join('');
  }, [text]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ブロック数式用（$$...$$）
export function MathBlock({ text, className }) {
  const html = useMemo(() => {
    if (!text) return '';

    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);

    return parts.map(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        try {
          return katex.renderToString(math, {
            throwOnError: false,
            displayMode: true,
          });
        } catch {
          return part;
        }
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        try {
          return katex.renderToString(math, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          return part;
        }
      }
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }).join('');
  }, [text]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
