import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';

const C = {
  bg: '#0A0E1A', card: 'rgba(20,30,60,0.9)', border: 'rgba(0,240,255,0.35)',
  cyan: '#00F0FF', text: '#E8F4FF', muted: '#8BA3C7',
  correct: '#00E676', wrong: '#FF1744',
};

export default function ResultScreen({ route, navigation }) {
  const { score, total, answers, title } = route.params;
  const percent = Math.round((score / total) * 100);
  let msg = 'Keep practicing';
  if (percent >= 90) msg = 'Outstanding performance!';
  else if (percent >= 70) msg = 'Great job!';
  else if (percent >= 50) msg = 'Good effort!';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>{title || 'Result'}</Text>
          <Text style={styles.scoreValue}>{score}<Text style={styles.scoreTotal}>/{total}</Text></Text>
          <Text style={styles.percent}>{percent}%</Text>
          <Text style={styles.msg}>{msg}</Text>
        </View>
        <Text style={styles.sectionTitle}>Review</Text>
        {answers.map((a, i) => (
          <View key={i} style={[styles.review, { borderLeftColor: a.isCorrect ? C.correct : C.wrong }]}>
            <View style={styles.reviewHead}>
              <Text style={styles.reviewNum}>Q{i + 1}</Text>
              <Text style={{ color: a.isCorrect ? C.correct : C.wrong, fontWeight: '700', fontSize: 12 }}>
                {a.isCorrect ? '✓ Correct' : '✗ Wrong'}
              </Text>
            </View>
            <Text style={styles.reviewQ}>{a.question}</Text>
            <Text style={styles.reviewA}>Your: {a.options[a.selected]}</Text>
            {!a.isCorrect && <Text style={{ color: C.correct, fontSize: 12, marginTop: 4 }}>Correct: {a.options[a.correct]}</Text>}
          </View>
        ))}
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.btnText}>← Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 40 },
  scoreCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 28, alignItems: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: C.border,
  },
  scoreLabel: { color: C.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  scoreValue: { fontSize: 48, fontWeight: '800', color: C.cyan },
  scoreTotal: { fontSize: 22, color: C.muted, fontWeight: '500' },
  percent: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 4 },
  msg: { color: C.muted, marginTop: 10, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  review: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewNum: { color: C.muted, fontWeight: '700', fontSize: 12 },
  reviewQ: { color: C.text, fontSize: 13, fontWeight: '500', marginBottom: 4 },
  reviewA: { color: C.muted, fontSize: 12 },
  btn: { backgroundColor: C.cyan, paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnText: { color: C.bg, fontSize: 15, fontWeight: '800' },
});
