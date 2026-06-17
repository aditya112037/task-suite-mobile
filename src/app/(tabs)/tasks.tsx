import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

import { getTasks, createTask } from "@/services/tasks";

export default function TasksScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createTask(title.trim());
      setTitle("");
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="New task"
        />
        <Button title="Create" onPress={handleCreate} />
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <Text>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  createRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  taskItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
