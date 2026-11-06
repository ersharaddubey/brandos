/**
 * Seed script - node seed.js  OR  npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Subject = require('./models/Subject');
const Syllabus = require('./models/Syllabus');
const Banner = require('./models/Banner');
const Admin = require('./models/Admin');
const Question = require('./models/Question');

const categoriesData = [
  { name: 'UPSC', description: 'Civil Services, IFS, IES, CAPF, EPFO', icon: '🇮🇳', order: 1 },
  { name: 'SSC', description: 'CGL, CHSL, MTS, GD, CPO, JE', icon: '🏛️', order: 2 },
  { name: 'Banking', description: 'IBPS, SBI, RBI, RRB', icon: '🏦', order: 3 },
  { name: 'Railways', description: 'RRB NTPC, Group D, ALP, JE', icon: '🚂', order: 4 },
  { name: 'Defence', description: 'NDA, CDS, AFCAT, Agniveer', icon: '🛡️', order: 5 },
  { name: 'Teaching', description: 'CTET, TET, KVS, NVS, UGC NET', icon: '👨‍🏫', order: 6 },
  { name: 'State PSC', description: 'UPPSC, BPSC, MPSC, RPSC & State PCS', icon: '📋', order: 7 },
  { name: 'Police', description: 'State Police, CAPF, Delhi Police', icon: '👮', order: 8 },
  { name: 'Insurance', description: 'LIC, NIACL, UIIC, OICL', icon: '🛡️', order: 9 },
  { name: 'PSU & Others', description: 'FCI, EPFO, ESIC, ISRO, DRDO', icon: '🏭', order: 10 },
  { name: 'Judicial', description: 'State Judicial Services', icon: '⚖️', order: 11 },
];

const commonSubjects = [
  { name: 'Quantitative Aptitude', icon: '🔢', order: 1 },
  { name: 'Reasoning Ability', icon: '🧠', order: 2 },
  { name: 'English Language', icon: '📝', order: 3 },
  { name: 'General Awareness', icon: '🌍', order: 4 },
  { name: 'General Knowledge', icon: '💡', order: 5 },
  { name: 'Current Affairs', icon: '📰', order: 6 },
  { name: 'Computer Awareness', icon: '💻', order: 7 },
  { name: 'General Science', icon: '🔬', order: 8 },
  { name: 'History', icon: '📜', order: 9 },
  { name: 'Geography', icon: '🗺️', order: 10 },
  { name: 'Polity', icon: '⚖️', order: 11 },
  { name: 'Economy', icon: '📈', order: 12 },
];

const bannersData = [
  { title: 'SSC CGL 2026', subtitle: 'Latest pattern practice questions', order: 1 },
  { title: 'Banking Exams', subtitle: 'IBPS · SBI PO & Clerk', order: 2 },
  { title: 'Railway RRB', subtitle: 'NTPC · Group D · ALP', order: 3 },
  { title: 'UPSC Prelims', subtitle: 'GS Paper I & CSAT', order: 4 },
  { title: 'Defence Exams', subtitle: 'NDA · CDS · AFCAT', order: 5 },
];

const syllabusMap = {
  'Quantitative Aptitude': [
    { title: 'Number System', topics: ['LCM', 'HCF', 'Fractions', 'Simplification'] },
    { title: 'Percentage & Ratio', topics: ['Percentage', 'Ratio', 'Partnership'] },
    { title: 'Profit & Interest', topics: ['Profit Loss', 'SI', 'CI'] },
    { title: 'Time Speed Work', topics: ['Time Work', 'Speed Distance', 'Boats'] },
  ],
  'Reasoning Ability': [
    { title: 'Verbal Reasoning', topics: ['Analogy', 'Series', 'Coding'] },
    { title: 'Logical Reasoning', topics: ['Syllogism', 'Blood Relation', 'Seating'] },
  ],
  'English Language': [
    { title: 'Grammar', topics: ['Tenses', 'Articles', 'Voice'] },
    { title: 'Vocabulary', topics: ['Synonyms', 'Antonyms', 'Idioms'] },
  ],
  'Polity': [
    { title: 'Constitution', topics: ['Preamble', 'FR', 'DPSP'] },
    { title: 'Governance', topics: ['Parliament', 'Judiciary'] },
  ],
};

// Large question bank — assigned by subject key
const questionBank = {
  'Quantitative Aptitude': [
    { question: 'What is 25% of 480?', options: ['100', '120', '140', '160'], correctAnswer: 1, difficulty: 'Easy', explanation: '25% of 480 = 120' },
    { question: 'If A:B = 3:5 and B:C = 2:3, then A:C is?', options: ['2:5', '3:5', '2:3', '3:10'], correctAnswer: 0, difficulty: 'Medium', explanation: 'A:B:C = 6:10:15 → A:C = 2:5' },
    { question: 'A train 120 m long passes a 180 m platform in 20 s. Speed is?', options: ['45 km/h', '54 km/h', '60 km/h', '72 km/h'], correctAnswer: 1, difficulty: 'Medium', explanation: '300m in 20s = 15 m/s = 54 km/h' },
    { question: 'SI on Rs.2000 at 5% p.a. for 3 years is?', options: ['Rs.200', 'Rs.250', 'Rs.300', 'Rs.350'], correctAnswer: 2, difficulty: 'Easy', explanation: 'SI = PRT/100 = 300' },
    { question: 'Average of 5 numbers is 20. One excluded, average becomes 18. Excluded number?', options: ['26', '28', '30', '32'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Sum 100 − 72 = 28' },
    { question: 'LCM of 12, 18 and 24 is?', options: ['36', '48', '72', '96'], correctAnswer: 2, difficulty: 'Easy', explanation: 'LCM = 72' },
    { question: 'A shopkeeper marks 40% above cost and gives 10% discount. Profit %?', options: ['26%', '30%', '24%', '28%'], correctAnswer: 0, difficulty: 'Medium', explanation: '1.4 × 0.9 = 1.26 → 26%' },
    { question: 'Compound interest on Rs.10000 at 10% for 2 years is?', options: ['Rs.2000', 'Rs.2100', 'Rs.2200', 'Rs.2500'], correctAnswer: 1, difficulty: 'Easy', explanation: '10000×(1.1)² − 10000 = 2100' },
    { question: 'If 15 men complete work in 20 days, 20 men will complete in?', options: ['12 days', '15 days', '18 days', '10 days'], correctAnswer: 1, difficulty: 'Easy', explanation: '15×20 = 20×d → d=15' },
    { question: 'Square root of 0.09 is?', options: ['0.3', '0.03', '0.003', '3'], correctAnswer: 0, difficulty: 'Easy', explanation: '√0.09 = 0.3' },
    { question: 'The HCF of two numbers is 12 and their LCM is 72. If one number is 24, other is?', options: ['36', '48', '30', '42'], correctAnswer: 0, difficulty: 'Medium', explanation: 'HCF×LCM = a×b → 12×72 = 24×b → b=36' },
    { question: 'A sum becomes Rs.2420 in 2 years at 10% CI. Principal is?', options: ['Rs.2000', 'Rs.2100', 'Rs.2200', 'Rs.1800'], correctAnswer: 0, difficulty: 'Medium', explanation: 'P(1.1)² = 2420 → P = 2000' },
  ],
  'Reasoning Ability': [
    { question: 'Find the odd one: 3, 5, 7, 9, 11', options: ['3', '5', '9', '11'], correctAnswer: 2, difficulty: 'Easy', explanation: '9 is not prime' },
    { question: 'If APPLE is coded as BQQMF, ORANGE is?', options: ['PSBOHF', 'PSBOFG', 'PSBNHF', 'PQBOHF'], correctAnswer: 0, difficulty: 'Medium', explanation: 'Each letter +1' },
    { question: 'In a row of 40 students, A is 12th from left. Rank from right?', options: ['28', '29', '27', '30'], correctAnswer: 1, difficulty: 'Easy', explanation: '40−12+1 = 29' },
    { question: 'Which is different: Circle, Triangle, Rectangle, Sphere', options: ['Circle', 'Triangle', 'Rectangle', 'Sphere'], correctAnswer: 3, difficulty: 'Easy', explanation: 'Sphere is 3D' },
    { question: 'Complete series: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '46'], correctAnswer: 1, difficulty: 'Medium', explanation: '+4,+6,+8,+10,+12 → 42' },
    { question: 'If CARE is coded as 3185, ROAD is coded as?', options: ['7814', '7813', '6814', '6813'], correctAnswer: 0, difficulty: 'Hard', explanation: 'Pattern based letter positions' },
    { question: 'A is brother of B. C is mother of A. D is father of C. How is B related to D?', options: ['Grandson/Granddaughter', 'Son', 'Nephew', 'Uncle'], correctAnswer: 0, difficulty: 'Medium', explanation: 'D is maternal grandfather' },
    { question: 'Statements: All cats are dogs. Some dogs are birds. Conclusion: Some cats are birds?', options: ['Yes', 'No', 'Cannot say', 'None'], correctAnswer: 2, difficulty: 'Medium', explanation: 'No definite relation' },
    { question: 'Mirror image of 3:40 on clock points approximately to?', options: ['8:20', '9:20', '7:20', '8:40'], correctAnswer: 0, difficulty: 'Hard', explanation: 'Mirror of h:m is (11:60 − h:m)' },
    { question: 'In coding, 2 is written as 5, 3 as 10, 4 as 17. How is 5 written?', options: ['24', '26', '25', '27'], correctAnswer: 1, difficulty: 'Medium', explanation: 'n²+1 → 25+1=26' },
  ],
  'English Language': [
    { question: 'Synonym of Abundant is?', options: ['Scarce', 'Plentiful', 'Rare', 'Limited'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Abundant = plentiful' },
    { question: 'Antonym of Benevolent is?', options: ['Kind', 'Malevolent', 'Generous', 'Friendly'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Benevolent opposite is malevolent' },
    { question: 'Choose correct: She ___ to school every day.', options: ['go', 'goes', 'going', 'gone'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Third person singular → goes' },
    { question: 'One word: A person who loves books', options: ['Bibliophile', 'Philosopher', 'Historian', 'Scholar'], correctAnswer: 0, difficulty: 'Medium', explanation: 'Bibliophile' },
    { question: 'Idiom "Break the ice" means?', options: ['To shatter glass', 'To start conversation', 'To freeze', 'To end friendship'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Start a conversation' },
    { question: 'Passive of: He writes a letter.', options: ['A letter is written by him', 'A letter was written', 'A letter wrote him', 'A letter writes'], correctAnswer: 0, difficulty: 'Easy', explanation: 'Present simple passive' },
    { question: 'Fill: The news ___ shocking.', options: ['are', 'is', 'were', 'have'], correctAnswer: 1, difficulty: 'Easy', explanation: 'News is singular' },
    { question: 'Error spot: He is senior than me.', options: ['is', 'senior', 'than', 'No error'], correctAnswer: 2, difficulty: 'Medium', explanation: 'senior to (not than)' },
    { question: 'Meaning of "Ephemeral"?', options: ['Long lasting', 'Short lived', 'Beautiful', 'Dangerous'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Lasting short time' },
    { question: 'Choose correct spelling:', options: ['Accomodation', 'Accommodation', 'Acommodation', 'Accomadation'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Accommodation' },
  ],
  'Polity': [
    { question: 'Father of the Indian Constitution?', options: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Dr. B.R. Ambedkar', 'Sardar Patel'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Dr. Ambedkar' },
    { question: 'Articles dealing with Right to Equality?', options: ['14-18', '19-22', '23-24', '25-28'], correctAnswer: 0, difficulty: 'Medium', explanation: 'Art 14 to 18' },
    { question: 'Minimum age to become President of India?', options: ['25', '30', '35', '40'], correctAnswer: 2, difficulty: 'Easy', explanation: '35 years' },
    { question: 'Which Schedule has Anti-defection provisions?', options: ['8th', '9th', '10th', '11th'], correctAnswer: 2, difficulty: 'Medium', explanation: '10th Schedule' },
    { question: 'How many Fundamental Rights are there currently?', options: ['5', '6', '7', '8'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Six (Right to Property removed)' },
    { question: 'Who appoints the Chief Justice of India?', options: ['PM', 'President', 'Parliament', 'Law Minister'], correctAnswer: 1, difficulty: 'Easy', explanation: 'President' },
    { question: 'Money Bill can be introduced only in?', options: ['Rajya Sabha', 'Lok Sabha', 'Either House', 'Joint Sitting'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Only Lok Sabha' },
    { question: 'Part IV of Constitution deals with?', options: ['Fundamental Rights', 'DPSP', 'Fundamental Duties', 'Union'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Directive Principles' },
  ],
  'General Awareness': [
    { question: 'Capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Canberra' },
    { question: 'Largest planet in solar system?', options: ['Earth', 'Saturn', 'Jupiter', 'Neptune'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Jupiter' },
    { question: 'Who invented the telephone?', options: ['Edison', 'Bell', 'Marconi', 'Tesla'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Alexander Graham Bell' },
    { question: 'Currency of Japan?', options: ['Yuan', 'Won', 'Yen', 'Ringgit'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Yen' },
    { question: 'National animal of India?', options: ['Lion', 'Elephant', 'Tiger', 'Peacock'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Bengal Tiger' },
    { question: 'First Indian to win Nobel Prize?', options: ['C.V. Raman', 'Rabindranath Tagore', 'Mother Teresa', 'Amartya Sen'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Tagore 1913' },
    { question: 'Longest river in India?', options: ['Yamuna', 'Godavari', 'Ganga', 'Brahmaputra'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Ganga' },
    { question: 'Headquarters of RBI is in?', options: ['Delhi', 'Kolkata', 'Mumbai', 'Chennai'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Mumbai' },
  ],
  'Computer Awareness': [
    { question: 'Full form of CPU?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Central Processor Utility'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Central Processing Unit' },
    { question: 'Which is an input device?', options: ['Monitor', 'Printer', 'Keyboard', 'Speaker'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Keyboard' },
    { question: '1 Byte equals?', options: ['4 bits', '8 bits', '16 bits', '32 bits'], correctAnswer: 1, difficulty: 'Easy', explanation: '8 bits' },
    { question: 'HTTP stands for?', options: ['Hyper Text Transfer Protocol', 'High Text Transfer Protocol', 'Hyper Transfer Text Protocol', 'Hyper Text Transmission Process'], correctAnswer: 0, difficulty: 'Easy', explanation: 'Hyper Text Transfer Protocol' },
    { question: 'Which memory is volatile?', options: ['ROM', 'Hard Disk', 'RAM', 'SSD'], correctAnswer: 2, difficulty: 'Easy', explanation: 'RAM loses data without power' },
    { question: 'Shortcut for copy in Windows?', options: ['Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+Z'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Ctrl+C' },
  ],
  'History': [
    { question: 'Who founded the Maurya Empire?', options: ['Ashoka', 'Chandragupta Maurya', 'Bindusara', 'Bimbisara'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Chandragupta Maurya' },
    { question: 'Battle of Plassey was fought in?', options: ['1757', '1764', '1857', '1526'], correctAnswer: 0, difficulty: 'Easy', explanation: '1757' },
    { question: 'Quit India Movement started in?', options: ['1940', '1942', '1945', '1930'], correctAnswer: 1, difficulty: 'Easy', explanation: '1942' },
    { question: 'First Governor-General of independent India?', options: ['Rajendra Prasad', 'Mountbatten', 'C. Rajagopalachari', 'Nehru'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Lord Mountbatten' },
    { question: 'Indus Valley site not in India?', options: ['Harappa', 'Mohenjo-daro', 'Lothal', 'Kalibangan'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Mohenjo-daro is in Pakistan' },
  ],
  'Geography': [
    { question: 'Tropic of Cancer passes through how many Indian states?', options: ['6', '7', '8', '9'], correctAnswer: 2, difficulty: 'Medium', explanation: '8 states' },
    { question: 'Highest peak in India?', options: ['K2', 'Kangchenjunga', 'Nanda Devi', 'Everest'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Kangchenjunga (in India)' },
    { question: 'Which is a peninsular river?', options: ['Ganga', 'Yamuna', 'Godavari', 'Indus'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Godavari' },
    { question: 'Western Ghats are also known as?', options: ['Sahyadri', 'Himadri', 'Purvanchal', 'Satpura'], correctAnswer: 0, difficulty: 'Easy', explanation: 'Sahyadri' },
    { question: 'Sundarbans are famous for?', options: ['Desert', 'Mangrove forest', 'Tea', 'Coffee'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Mangrove forests' },
  ],
  'Economy': [
    { question: 'Who presents the Union Budget in India?', options: ['PM', 'Finance Minister', 'RBI Governor', 'President'], correctAnswer: 1, difficulty: 'Easy', explanation: 'Finance Minister' },
    { question: 'GST was implemented in India in?', options: ['2015', '2016', '2017', '2018'], correctAnswer: 2, difficulty: 'Easy', explanation: '1 July 2017' },
    { question: 'NITI Aayog replaced?', options: ['Planning Commission', 'Finance Commission', 'Election Commission', 'UGC'], correctAnswer: 0, difficulty: 'Easy', explanation: 'Planning Commission' },
    { question: 'Repo rate is decided by?', options: ['SBI', 'RBI', 'Finance Ministry', 'SEBI'], correctAnswer: 1, difficulty: 'Easy', explanation: 'RBI' },
    { question: 'Fiscal deficit means?', options: ['Export > Import', 'Govt expenditure > revenue', 'Revenue > expenditure', 'Import > Export'], correctAnswer: 1, difficulty: 'Medium', explanation: 'Spending exceeds income' },
  ],
  'General Science': [
    { question: 'Chemical formula of water?', options: ['CO2', 'H2O', 'O2', 'NaCl'], correctAnswer: 1, difficulty: 'Easy', explanation: 'H2O' },
    { question: 'Speed of light is approximately?', options: ['3×10^6 m/s', '3×10^8 m/s', '3×10^10 m/s', '3×10^5 m/s'], correctAnswer: 1, difficulty: 'Easy', explanation: '3×10^8 m/s' },
    { question: 'Which vitamin from sunlight?', options: ['A', 'B', 'C', 'D'], correctAnswer: 3, difficulty: 'Easy', explanation: 'Vitamin D' },
    { question: 'SI unit of force?', options: ['Joule', 'Watt', 'Newton', 'Pascal'], correctAnswer: 2, difficulty: 'Easy', explanation: 'Newton' },
    { question: 'pH of pure water is?', options: ['5', '6', '7', '8'], correctAnswer: 2, difficulty: 'Easy', explanation: '7 (neutral)' },
  ],
};

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@quiz.com';
    let admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      admin = await Admin.create({
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'admin123',
        name: 'Super Admin',
      });
      console.log('✅ Admin created:', adminEmail);
    } else console.log('ℹ️  Admin already exists');

    console.log('\n--- Categories ---');
    const catMap = {};
    for (const c of categoriesData) {
      let cat = await Category.findOne({ name: c.name });
      if (!cat) {
        cat = await Category.create(c);
        console.log('  +', c.icon, c.name);
      } else console.log('  ·', c.name);
      catMap[c.name] = cat;
    }

    console.log('\n--- Subjects ---');
    let subCount = 0;
    const subjectMap = {};
    for (const [catName, cat] of Object.entries(catMap)) {
      for (const s of commonSubjects) {
        const key = `${catName}_${s.name}`;
        let sub = await Subject.findOne({ name: s.name, category: cat._id });
        if (!sub) {
          sub = await Subject.create({ name: s.name, category: cat._id, icon: s.icon, order: s.order });
          subCount++;
        }
        subjectMap[key] = sub;
      }
    }
    console.log(`  + ${subCount} new subjects`);

    console.log('\n--- Syllabus ---');
    let sylCount = 0;
    const sscCat = catMap['SSC'];
    if (sscCat) {
      for (const [subName, chapters] of Object.entries(syllabusMap)) {
        const sub = subjectMap[`SSC_${subName}`];
        if (!sub) continue;
        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          const exists = await Syllabus.findOne({ title: ch.title, subject: sub._id });
          if (!exists) {
            await Syllabus.create({
              title: ch.title, subject: sub._id, category: sscCat._id,
              topics: ch.topics, order: i + 1,
            });
            sylCount++;
          }
        }
      }
    }
    console.log(`  + ${sylCount} syllabus items`);

    console.log('\n--- Banners ---');
    let banCount = 0;
    for (const b of bannersData) {
      if (!(await Banner.findOne({ title: b.title }))) {
        await Banner.create(b);
        banCount++;
        console.log('  +', b.title);
      }
    }
    if (!banCount) console.log('  · already exist');

    console.log('\n--- Questions ---');
    let qCount = 0;
    // Seed questions under SSC for each subject that has bank data
    for (const [subName, qs] of Object.entries(questionBank)) {
      const sub = subjectMap[`SSC_${subName}`];
      if (!sub || !sscCat) continue;
      for (const q of qs) {
        const exists = await Question.findOne({ question: q.question });
        if (!exists) {
          await Question.create({
            ...q,
            category: sscCat._id,
            subject: sub._id,
            categoryName: 'SSC',
            subjectName: subName,
          });
          qCount++;
        }
      }
    }
    // Also copy quant/reasoning to Banking
    const bankCat = catMap['Banking'];
    if (bankCat) {
      for (const subName of ['Quantitative Aptitude', 'Reasoning Ability', 'English Language']) {
        const sub = subjectMap[`Banking_${subName}`];
        const qs = questionBank[subName] || [];
        for (const q of qs.slice(0, 5)) {
          const exists = await Question.findOne({ question: q.question + ' ', subject: sub?._id });
          if (!exists && sub) {
            await Question.create({
              ...q,
              question: q.question,
              category: bankCat._id,
              subject: sub._id,
              categoryName: 'Banking',
              subjectName: subName,
            });
            qCount++;
          }
        }
      }
    }
    console.log(`  + ${qCount} questions created`);

    console.log('\n========================================');
    console.log('🌱 Seed completed!');
    console.log('Admin: admin@quiz.com / admin123');
    console.log('========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
