import { GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PROJECTS = [
  {
    id: '1',
    title: 'Task Suite',
    icon: Platform.OS === 'ios' ? 'square.stack.3d.up.fill' : 'folder',
    accent: '#3c87f7',
    tasks: [
      { id: 't1', title: 'Finish Marketing Video', done: false },
      { id: 't2', title: 'Contact Leads', done: false },
      { id: 't3', title: 'Update Website', done: false },
    ],
  },
  {
    id: '2',
    title: 'Marketing',
    icon: Platform.OS === 'ios' ? 'megaphone.fill' : 'campaign',
    accent: '#f7a83c',
    tasks: [
      { id: 't4', title: 'Create social media posts', done: false },
      { id: 't5', title: 'Design new brochure', done: false },
    ],
  },
  {
    id: '3',
    title: 'College',
    icon: Platform.OS === 'ios' ? 'book.fill' : 'school',
    accent: '#7c3cf7',
    tasks: [
      { id: 't6', title: 'Submit CS assignment', done: false },
      { id: 't7', title: 'Prepare for math exam', done: false },
    ],
  },
];

export default function ProjectsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={styles.contentContainer}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Projects
          </ThemedText>
          <ThemedText themeColor="textSecondary">{PROJECTS.length} active projects</ThemedText>
        </ThemedView>

        <ThemedView style={styles.projectList}>
          {PROJECTS.map((project) => (
            <GlassView key={project.id} style={styles.projectCard}>
              <ThemedView style={styles.projectHeader}>
                <ThemedView
                  style={[styles.projectIcon, { backgroundColor: project.accent + '20' }]}>
                  <SymbolView tintColor={project.accent} name={project.icon as any} size={20} />
                </ThemedView>
                <ThemedView style={styles.projectInfo}>
                  <ThemedText type="default" style={styles.projectTitle}>
                    {project.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {project.tasks.length} task{project.tasks.length !== 1 ? 's' : ''}
                  </ThemedText>
                </ThemedView>
              </ThemedView>

              <ThemedView style={styles.projectTasks}>
                {project.tasks.map((task) => (
                  <ThemedView key={task.id} style={styles.projectTask}>
                    <SymbolView
                      tintColor={theme.textSecondary}
                      name={{ ios: 'circle', android: 'radio_button_unchecked' }}
                      size={18}
                    />
                    <ThemedText type="small" style={styles.taskText}>
                      {task.title}
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            </GlassView>
          ))}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
  },
  header: {
    marginBottom: Spacing.five,
  },
  headerTitle: {
    fontSize: 36,
    lineHeight: 44,
  },
  projectList: {
    gap: Spacing.four,
  },
  projectCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    gap: 2,
  },
  projectTitle: {
    fontWeight: 700,
  },
  projectTasks: {
    gap: Spacing.two,
    paddingLeft: Spacing.one,
  },
  projectTask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  taskText: {
    flex: 1,
  },
});
