import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Typography, Fonts, ThemeTextColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'hero' | 'section' | 'cardTitle' | 'body' | 'caption' | 'captionBold' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeTextColor;
};

export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'hero' && Typography.hero,
        type === 'section' && Typography.section,
        type === 'cardTitle' && Typography.cardTitle,
        type === 'body' && Typography.body,
        type === 'caption' && Typography.caption,
        type === 'captionBold' && Typography.captionBold,
        type === 'small' && Typography.small,
        type === 'smallBold' && Typography.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '600',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
