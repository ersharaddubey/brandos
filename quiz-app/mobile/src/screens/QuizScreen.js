import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';

const C = {
  bg: '#0A0E1A', card: 'rgba(20,30,60,0.9)', border: 'rgba(0,240,255,0.35)',
  cyan: '#00F0FF', text: '#E8F4FF', muted: '#8BA3C7',
  correct: '#00E676', wrong: '#FF1744',
};

export default function QuizScreen({ route, navigation }) {
  const { questions, title } = route.params;
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  const handleSelect = (i) => { if (!showFeedback) setSelected(i); };

  const handleNext = () => {
    if (selected === null) return;
    const isCorrect = selected === q.correctAnswer;
    const newAnswers = [...answers, {
      questionId: q._id, selected, correct: q.correctAnswer, isCorrect,
      question: q.question, options: q.options,
    }];
    setAnswers(newAnswers);
    if (current + 1 < questions.length) {
      setCurrent(current + 1); setSelected(null); setShowFeedback(false);
    } else {
      navigation.replace('Result', {
        score: newAnswers.filter((a) => a.isCorrect).length,
        total: questions.length, answers: newAnswers, title: title || 'Quiz',
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Quiz'}</Text>
        <Text style={styles.progressText}>{current + 1} / {questions.length}</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${progress}%` }]} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.qCard}>
          <Text style={styles.qLabel}>QUESTION {current + 1}</Text>
          <Text style={styles.qText}>{q.question}</Text>
        </View>
        {q.options.map((opt, i) => {
          let s = styles.opt;
          let t = styles.optText;
          if (showFeedback) {
            if (i === q.correctAnswer) { s = [styles.opt, styles.optOk]; t = [styles.optText, { color: C.correct }]; }
            else if (i === selected) { s = [styles.opt, styles.optBad]; t = [styles.optText, { color: C.wrong }]; }
          } else if (selected === i) { s = [styles.opt, styles.optSel]; t = [styles.optText, { color: C.cyan }]; }
          return (
            <TouchableOpacity key={i} style={s} onPress={() => handleSelect(i)} disabled={showFeedback}>
              <View style={styles.letter}><Text style={styles.letterT}>{String.fromCharCode(65 + i)}</Text></View>
              <Text style={t}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
        {!showFeedback ? (
          <TouchableOpacity style={[styles.btn, selected === null && styles.btnOff]} onPress={() => selected !== null && setShowFeedback(true)} disabled={selected === null}>
            <Text style={styles.btnText}>Check Answer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={handleNext}>
            <Text style={styles.btnText}>{current + 1 < questions.length ? 'Next →' : 'See Result →'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  progressText: { color: C.muted, fontSize: 12, marginTop: 4, marginBottom: 10 },
  barBg: { height: 4, backgroundColor: 'rgba(0,240,255,0.15)', borderRadius: 2 },
  barFill: { height: 4, backgroundColor: C.cyan, borderRadius: 2 },
  content: { padding: 20 },
  qCard: { backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: C.border },
  qLabel: { color: C.cyan, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  qText: { color: C.text, fontSize: 16, fontWeight: '600', lineHeight: 24 },
  opt: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0,240,255,0.15)' },
  optSel: { borderColor: C.cyan, backgroundColor: 'rgba(0,240,255,0.1)' },
  optOk: { borderColor: C.correct, backgroundColor: 'rgba(0,230,118,0.1)' },
  optBad: { borderColor: C.wrong, backgroundColor: 'rgba(255,23,68,0.1)' },
  letter: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,240,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  letterT: { color: C.cyan, fontWeight: '800', fontSize: 13 },
  optText: { flex: 1, color: C.text, fontSize: 14, fontWeight: '500' },
  btn: { backgroundColor: C.cyan, paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnOff: { opacity: 0.4 },
  btnText: { color: C.bg, fontSize: 15, fontWeight: '800' },
});
