import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, StatusBar, Dimensions, FlatList,
} from 'react-native';
import API from '../services/api';

const { width } = Dimensions.get('window');
const SLIDE_W = width - 40;

// Holographic palette
const C = {
  bg: '#0A0E1A',
  card: 'rgba(20, 30, 60, 0.85)',
  glass: 'rgba(100, 200, 255, 0.08)',
  border: 'rgba(0, 240, 255, 0.35)',
  cyan: '#00F0FF',
  magenta: '#FF00E5',
  purple: '#8B5CF6',
  text: '#E8F4FF',
  muted: '#8BA3C7',
  glow: '#00D4FF',
};

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [bRes, cRes, sRes] = await Promise.all([
        API.get('/banners'), API.get('/categories'), API.get('/subjects'),
      ]);
      setBanners(bRes.data || []);
      setCategories(cRes.data || []);
      setSubjects(sRes.data || []);
      if (cRes.data?.length) setSelectedCategory(cRes.data[0]._id);
    } catch (err) {
      setError('Server se connect nahi ho paaya.');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setBannerIndex((p) => {
        const n = (p + 1) % banners.length;
        try { bannerRef.current?.scrollToIndex({ index: n, animated: true }); } catch (_) {}
        return n;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [banners]);

  const filteredSubjects = selectedCategory
    ? subjects.filter((s) => (s.category?._id || s.category) === selectedCategory)
    : subjects;

  const startQuiz = async (subjectId, subjectName, categoryId) => {
    try {
      const res = await API.get('/questions', { params: { subject: subjectId, category: categoryId } });
      const qs = res.data || [];
      if (!qs.length) { alert('Is subject me abhi koi question nahi hai.'); return; }
      navigation.navigate('Quiz', { questions: qs, title: subjectName });
    } catch { alert('Questions load nahi ho paye'); }
  };

  const startCategoryQuiz = async (catId, catName) => {
    try {
      const res = await API.get('/questions', { params: { category: catId } });
      const qs = res.data || [];
      if (!qs.length) { alert('Is exam me abhi koi question nahi hai.'); return; }
      navigation.navigate('Quiz', { questions: qs, title: catName });
    } catch { alert('Questions load nahi ho paye'); }
  };

  const renderBanner = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.slideInner}>
        <Text style={styles.slideTitle} numberOfLines={1}>{item.title}</Text>
        {!!item.subtitle && (
          <Text style={styles.slideSub} numberOfLines={2}>{item.subtitle}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={{ color: C.muted, marginTop: 12 }}>Loading hologram...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>◈ Govt Exam Quiz</Text>
        </View>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.btn} onPress={fetchData}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.hero}>
          <Text style={styles.heroBadge}>HOLOGRAPHIC</Text>
          <Text style={styles.heroTitle}>◈ Govt Exam Quiz</Text>
          <Text style={styles.heroSub}>SSC · Banking · UPSC · Railways · Defence</Text>
        </View>

        {banners.length > 0 && (
          <View style={styles.sliderWrap}>
            <FlatList
              ref={bannerRef}
              data={banners}
              renderItem={renderBanner}
              keyExtractor={(item) => item._id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={SLIDE_W + 12}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 20 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (SLIDE_W + 12));
                setBannerIndex(Math.min(idx, banners.length - 1));
              }}
              getItemLayout={(_, index) => ({
                length: SLIDE_W + 12,
                offset: (SLIDE_W + 12) * index,
                index,
              })}
            />
            <View style={styles.tabsRow}>
              {banners.map((b, i) => (
                <TouchableOpacity
                  key={b._id}
                  style={[styles.tab, i === bannerIndex && styles.tabActive]}
                  onPress={() => {
                    setBannerIndex(i);
                    try { bannerRef.current?.scrollToIndex({ index: i, animated: true }); } catch (_) {}
                  }}
                >
                  <Text style={[styles.tabText, i === bannerIndex && styles.tabTextActive]} numberOfLines={1}>
                    {b.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Exam</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => {
              const active = selectedCategory === cat._id;
              return (
                <TouchableOpacity
                  key={cat._id}
                  style={[styles.catCard, active && styles.catCardActive]}
                  onPress={() => setSelectedCategory(cat._id)}
                  onLongPress={() => startCategoryQuiz(cat._id, cat.name)}
                >
                  <Text style={styles.catIcon}>{cat.icon || '◈'}</Text>
                  <Text style={[styles.catName, active && styles.catNameActive]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>
              Subjects{selectedCategory ? ` · ${categories.find((c) => c._id === selectedCategory)?.name || ''}` : ''}
            </Text>
            {selectedCategory && (
              <TouchableOpacity onPress={() => startCategoryQuiz(selectedCategory, categories.find((c) => c._id === selectedCategory)?.name)}>
                <Text style={styles.link}>All →</Text>
              </TouchableOpacity>
            )}
          </View>
          {filteredSubjects.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Subjects abhi add nahi hue. Admin se seed karein.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredSubjects.map((sub) => (
                <TouchableOpacity
                  key={sub._id}
                  style={styles.subCard}
                  onPress={() => startQuiz(sub._id, sub.name, sub.category?._id || sub.category)}
                >
                  <Text style={styles.subIcon}>{sub.icon || '◇'}</Text>
                  <Text style={styles.subName} numberOfLines={2}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.refresh} onPress={fetchData}>
          <Text style={styles.link}>↻ Refresh</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  hero: {
    paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  heroBadge: {
    color: C.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 8,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: C.text },
  heroSub: { fontSize: 13, color: C.muted, marginTop: 8 },
  sliderWrap: { marginTop: 20 },
  slide: { width: SLIDE_W },
  slideInner: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 22,
    paddingHorizontal: 20,
    minHeight: 100,
    justifyContent: 'center',
  },
  slideTitle: { fontSize: 18, fontWeight: '700', color: C.cyan, marginBottom: 6 },
  slideSub: { fontSize: 13, color: C.muted, lineHeight: 18 },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    backgroundColor: C.glass,
  },
  tabActive: {
    borderColor: C.cyan,
    backgroundColor: 'rgba(0,240,255,0.15)',
  },
  tabText: { fontSize: 11, color: C.muted, fontWeight: '600', maxWidth: 90 },
  tabTextActive: { color: C.cyan },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: C.cyan, fontWeight: '700', fontSize: 13 },
  catCard: {
    backgroundColor: C.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    marginRight: 10, alignItems: 'center', minWidth: 86,
    borderWidth: 1, borderColor: 'transparent',
  },
  catCardActive: { borderColor: C.cyan, backgroundColor: 'rgba(0,240,255,0.1)' },
  catIcon: { fontSize: 24, marginBottom: 6 },
  catName: { fontSize: 12, fontWeight: '600', color: C.muted },
  catNameActive: { color: C.cyan },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  subCard: {
    width: '48%', backgroundColor: C.card, borderRadius: 14, padding: 16,
    marginBottom: 12, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  subIcon: { fontSize: 28, marginBottom: 8 },
  subName: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' },
  empty: { backgroundColor: C.card, padding: 24, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  emptyText: { color: C.muted, textAlign: 'center', fontSize: 13 },
  errorBox: { margin: 20, padding: 24, backgroundColor: C.card, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  errorText: { color: '#FF6B8A', textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: C.cyan, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: C.bg, fontWeight: '800' },
  refresh: { marginTop: 20, alignItems: 'center', padding: 12 },
});
