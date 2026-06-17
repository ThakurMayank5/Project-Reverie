import { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeOutRight,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { ReverieLogo } from '@/components/reverie-logo';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TodoItem({
  item,
  onToggle,
  onDelete,
}: {
  item: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const checkScale = useSharedValue(1);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleToggle = useCallback(() => {
    checkScale.value = withSpring(0.8, { damping: 6, stiffness: 500 }, () => {
      checkScale.value = withSpring(1, { damping: 8, stiffness: 300 });
    });
    onToggle(item.id);
  }, [item.id, onToggle, checkScale]);

  return (
    <AnimatedPressable
      entering={FadeInDown.springify().damping(15).stiffness(120)}
      exiting={FadeOutRight.duration(200)}
      layout={LinearTransition.springify().damping(15)}
      onPress={handleToggle}
      style={[
        styles.todoItem,
        {
          backgroundColor: theme.todoBackground,
          borderColor: item.completed ? theme.successSoft : theme.todoBorder,
        },
      ]}
    >
      {/* Checkbox */}
      <Animated.View style={checkAnimStyle}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: item.completed ? theme.success : theme.border,
              backgroundColor: item.completed ? theme.success : 'transparent',
            },
          ]}
        >
          {item.completed && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
      </Animated.View>

      {/* Todo text */}
      <View style={styles.todoTextContainer}>
        <Text
          style={[
            styles.todoText,
            {
              color: item.completed ? theme.completedText : theme.text,
              textDecorationLine: item.completed ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {item.text}
        </Text>
      </View>

      {/* Delete button */}
      <Pressable
        onPress={() => onDelete(item.id)}
        style={[styles.deleteButton, { backgroundColor: theme.dangerSoft }]}
        hitSlop={8}
      >
        <Text style={[styles.deleteText, { color: theme.danger }]}>
          ✕
        </Text>
      </Pressable>
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const addTodo = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setTodos((prev) => [
      {
        id: Date.now().toString(),
        text: trimmed,
        completed: false,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setInputText('');
    Keyboard.dismiss();
  }, [inputText]);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }, []);

  const handleSecretActivated = useCallback(() => {
    router.push('/secret');
  }, [router]);

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <ReverieLogo onSecretActivated={handleSecretActivated} />
          <View style={styles.headerText}>
            <Text style={[styles.appName, { color: theme.text }]}>
              Reverie
            </Text>
            <Text
              style={[styles.appTagline, { color: theme.textSecondary }]}
            >
              Capture your thoughts
            </Text>
          </View>
        </View>

        {/* Stats bar */}
        {totalCount > 0 && (
          <View
            style={[
              styles.statsBar,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <View style={styles.statItem}>
              <Text
                style={[styles.statNumber, { color: theme.accent }]}
              >
                {totalCount}
              </Text>
              <Text
                style={[styles.statLabel, { color: theme.textSecondary }]}
              >
                Total
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.statItem}>
              <Text
                style={[styles.statNumber, { color: theme.success }]}
              >
                {completedCount}
              </Text>
              <Text
                style={[styles.statLabel, { color: theme.textSecondary }]}
              >
                Done
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNumber,
                  { color: theme.accentLight },
                ]}
              >
                {totalCount - completedCount}
              </Text>
              <Text
                style={[styles.statLabel, { color: theme.textSecondary }]}
              >
                Remaining
              </Text>
            </View>
          </View>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: theme.text,
              },
            ]}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={addTodo}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <Pressable
            onPress={addTodo}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        {/* Todo list */}
        <FlatList
          data={todos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TodoItem
              item={item}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          )}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text
                style={[styles.emptyTitle, { color: theme.textSecondary }]}
              >
                No thoughts yet
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                Add your first todo to get started
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.three,
  },
  headerText: {
    gap: 2,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsBar: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: Spacing.three,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.three,
    alignItems: 'center',
    paddingLeft: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 14,
  },
  addButton: {
    width: 48,
    height: 48,
    marginRight: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  todoTextContainer: {
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#7C3AED',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
});
