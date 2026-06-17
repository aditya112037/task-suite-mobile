import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onPress: () => void;
};

export function GoogleSignInButton({ onPress }: Props) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>G</Text>
      </View>
      <Text style={styles.label}>Continue with Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  label: {
    fontSize: 16,
    color: '#3c4043',
    fontWeight: '500',
  },
});
