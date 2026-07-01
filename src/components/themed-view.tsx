import { View, type ViewProps } from 'react-native';

import { ThemeTextColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeTextColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const backgroundColor = type ? theme[type] : undefined;

  return <View style={[backgroundColor ? { backgroundColor } : null, style]} {...otherProps} />;
}
