import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface HighlightTextProps {
  text: string;
  highlight: string;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * Highlights matches of the query string within the text.
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  highlight,
  style,
  highlightStyle,
  numberOfLines,
}) => {
  if (!highlight || !highlight.trim()) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Escape special regex characters in the highlight string
  const escaped = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === highlight.trim().toLowerCase();
        return (
          <Text
            key={index}
            style={isMatch ? highlightStyle : undefined}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
};
