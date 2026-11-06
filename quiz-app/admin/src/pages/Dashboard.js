import React, { useState, useEffect } from 'react';
import API from '../services/api';

function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [syllabusList, setSyllabusList] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // question | category | subject | syllabus | banner
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forms
  const [qForm, setQForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    category: '',
    subject: '',
    syllabus: '',
    difficulty: 'Medium',
    explanation: ''
  });
  const [catForm, setCatForm] = useState({ name: '', description: '', icon: '📚', order: 0 });
  const [subForm, setSubForm] = useState({ name: '', category: '', description: '', icon: '📖', order: 0 });
  const [sylForm, setSylForm] = useState({ title: '', subject: '', category: '', topics: '', description: '', order: 0 });
  const [banForm, setBanForm] = useState({ title: '', subtitle: '', image: '', order: 0 });
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfCategory, setPdfCategory] = useState('');
  const [pdfSubject, setPdfSubject] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [qRes, cRes, sRes, syRes, bRes] = await Promise.all([
        API.get('/questions'),
        API.get('/categories?all=true'),
        API.get('/subjects?all=true'),
        API.get('/syllabus?all=true'),
        API.get('/banners?all=true')
      ]);
      setQuestions(qRes.data);
      setCategories(cRes.data);
      setSubjects(sRes.data);
      setSyllabusList(syRes.data);
      setBanners(bRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const showMsg = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

  // ---- Category handlers ----
  const openCat = (item = null) => {
    setModalType('category');
    setEditing(item?._id || null);
    setCatForm(item ? { name: item.name, description: item.description || '', icon: item.icon || '📚', order: item.order || 0 } : { name: '', description: '', icon: '📚', order: 0 });
    setShowModal(true);
  };

  const saveCat = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await API.put(`/categories/${editing}`, catForm);
        showMsg('Category updated!');
      } else {
        await API.post('/categories', catForm);
        showMsg('Category added!');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed', true);
    }
  };

  const deleteCat = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await API.delete(`/categories/${id}`);
      showMsg('Category deleted!');
      fetchAll();
    } catch (err) {
      showMsg('Delete failed', true);
    }
  };

  // ---- Subject handlers ----
  const openSub = (item = null) => {
    setModalType('subject');
    setEditing(item?._id || null);
    setSubForm(item ? {
      name: item.name,
      category: item.category?._id || item.category || '',
      description: item.description || '',
      icon: item.icon || '📖',
      order: item.order || 0
    } : { name: '', category: '', description: '', icon: '📖', order: 0 });
    setShowModal(true);
  };

  const saveSub = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await API.put(`/subjects/${editing}`, subForm);
        showMsg('Subject updated!');
      } else {
        await API.post('/subjects', subForm);
        showMsg('Subject added!');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed', true);
    }
  };

  const deleteSub = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await API.delete(`/subjects/${id}`);
      showMsg('Subject deleted!');
      fetchAll();
    } catch (err) {
      showMsg('Delete failed', true);
    }
  };

  // ---- Syllabus handlers ----
  const openSyl = (item = null) => {
    setModalType('syllabus');
    setEditing(item?._id || null);
    setSylForm(item ? {
      title: item.title,
      subject: item.subject?._id || item.subject || '',
      category: item.category?._id || item.category || '',
      topics: (item.topics || []).join(', '),
      description: item.description || '',
      order: item.order || 0
    } : { title: '', subject: '', category: '', topics: '', description: '', order: 0 });
    setShowModal(true);
  };

  const saveSyl = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...sylForm,
        topics: sylForm.topics ? sylForm.topics.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      if (editing) {
        await API.put(`/syllabus/${editing}`, payload);
        showMsg('Syllabus updated!');
      } else {
        await API.post('/syllabus', payload);
        showMsg('Syllabus added!');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed', true);
    }
  };

  const deleteSyl = async (id) => {
    if (!window.confirm('Delete this syllabus?')) return;
    try {
      await API.delete(`/syllabus/${id}`);
      showMsg('Syllabus deleted!');
      fetchAll();
    } catch (err) {
      showMsg('Delete failed', true);
    }
  };

  // ---- Banner handlers ----
  const openBan = (item = null) => {
    setModalType('banner');
    setEditing(item?._id || null);
    setBanForm(item ? {
      title: item.title,
      subtitle: item.subtitle || '',
      image: item.image || '',
      order: item.order || 0
    } : { title: '', subtitle: '', image: '', order: 0 });
    setShowModal(true);
  };

  const saveBan = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await API.put(`/banners/${editing}`, banForm);
        showMsg('Banner updated!');
      } else {
        await API.post('/banners', banForm);
        showMsg('Banner added!');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed', true);
    }
  };

  const deleteBan = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await API.delete(`/banners/${id}`);
      showMsg('Banner deleted!');
      fetchAll();
    } catch (err) {
      showMsg('Delete failed', true);
    }
  };

  // ---- Question handlers ----
  const openQ = (item = null) => {
    setModalType('question');
    setEditing(item?._id || null);
    if (item) {
      setQForm({
        question: item.question,
        options: [...item.options],
        correctAnswer: item.correctAnswer,
        category: item.category?._id || item.category || '',
        subject: item.subject?._id || item.subject || '',
        syllabus: item.syllabus?._id || item.syllabus || '',
        difficulty: item.difficulty || 'Medium',
        explanation: item.explanation || ''
      });
    } else {
      setQForm({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        category: '',
        subject: '',
        syllabus: '',
        difficulty: 'Medium',
        explanation: ''
      });
    }
    setShowModal(true);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...qForm.options];
    newOptions[index] = value;
    setQForm({ ...qForm, options: newOptions });
  };

  const addOption = () => {
    if (qForm.options.length < 6) {
      setQForm({ ...qForm, options: [...qForm.options, ''] });
    }
  };

  const removeOption = (index) => {
    if (qForm.options.length > 2) {
      const newOptions = qForm.options.filter((_, i) => i !== index);
      let correct = qForm.correctAnswer;
      if (correct === index) correct = 0;
      else if (correct > index) correct--;
      setQForm({ ...qForm, options: newOptions, correctAnswer: correct });
    }
  };

  const saveQ = async (e) => {
    e.preventDefault();
    const filledOptions = qForm.options.filter(o => o.trim());
    if (filledOptions.length < 2) {
      showMsg('At least 2 options required', true);
      return;
    }
    if (!qForm.question.trim() || !qForm.category || !qForm.subject) {
      showMsg('Question, Category and Subject are required', true);
      return;
    }
    const payload = {
      ...qForm,
      options: filledOptions,
      correctAnswer: Math.min(qForm.correctAnswer, filledOptions.length - 1),
      syllabus: qForm.syllabus || undefined
    };
    try {
      if (editing) {
        await API.put(`/questions/${editing}`, payload);
        showMsg('Question updated!');
      } else {
        await API.post('/questions', payload);
        showMsg('Question added!');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed', true);
    }
  };

  const deleteQ = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await API.delete(`/questions/${id}`);
      showMsg('Question deleted!');
      fetchAll();
    } catch (err) {
      showMsg('Delete failed', true);
    }
  };


  const uploadPdf = async () => {
    if (!pdfFile || !pdfCategory || !pdfSubject) {
      showMsg('PDF, Category and Subject required', true);
      return;
    }
    setPdfLoading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('category', pdfCategory);
      formData.append('subject', pdfSubject);
      formData.append('difficulty', 'Medium');
      const res = await API.post('/upload/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showMsg(res.data.message || 'PDF imported!');
      setPdfFile(null);
      setShowModal(false);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'PDF upload failed', true);
    } finally {
      setPdfLoading(false);
    }
  };

  // Seed helpers
  const seedCategories = async () => {
    try {
      await API.post('/categories/seed');
      showMsg('Default government exam categories seeded!');
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Seed failed', true);
    }
  };

  const seedSubjects = async () => {
    try {
      await API.post('/subjects/seed');
      showMsg('Common subjects seeded!');
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Seed failed', true);
    }
  };

  const seedBanners = async () => {
    try {
      await API.post('/banners/seed');
      showMsg('Default banners seeded!');
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Seed failed', true);
    }
  };

  // Filtered subjects for forms
  const filteredSubjects = qForm.category
    ? subjects.filter(s => (s.category?._id || s.category) === qForm.category)
    : subjects;

  const filteredSyllabus = qForm.subject
    ? syllabusList.filter(s => (s.subject?._id || s.subject) === qForm.subject)
    : syllabusList;

  const sylSubjects = sylForm.category
    ? subjects.filter(s => (s.category?._id || s.category) === sylForm.category)
    : subjects;

  return (
    <div>
      <div className="header">
        <h1>📚 Govt Exam Quiz Admin</h1>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="container" style={{ marginTop: 16 }}>
        {success && <div className="card" style={{ background: '#d4edda', color: '#155724' }}>{success}</div>}
        {error && !showModal && <div className="card" style={{ background: '#f8d7da', color: '#721c24' }}>{error}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'questions', label: 'Questions' },
            { id: 'categories', label: 'Categories' },
            { id: 'subjects', label: 'Subjects' },
            { id: 'syllabus', label: 'Syllabus' },
            { id: 'banners', label: 'Banners / Slider' }
          ].map(t => (
            <button
              key={t.id}
              className={`btn ${tab === t.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* QUESTIONS TAB */}
        {tab === 'questions' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h2>All Questions ({questions.length})</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" style={{ color: '#1B4332', borderColor: '#2D6A4F' }} onClick={() => { setModalType('pdf'); setShowModal(true); setPdfFile(null); setPdfCategory(''); setPdfSubject(''); }}>📄 Upload PDF</button>
                <button className="btn btn-primary" onClick={() => openQ()}>+ Add Question</button>
              </div>
            </div>
            {loading ? <p>Loading...</p> : questions.length === 0 ? (
              <div className="empty"><p>No questions yet. Add categories & subjects first, then questions.</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Category</th>
                    <th>Subject</th>
                    <th>Difficulty</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, i) => (
                    <tr key={q._id}>
                      <td>{i + 1}</td>
                      <td style={{ maxWidth: 280 }}>{q.question}</td>
                      <td>{q.categoryName || q.category?.name || '-'}</td>
                      <td>{q.subjectName || q.subject?.name || '-'}</td>
                      <td>
                        <span className={`badge badge-${q.difficulty?.toLowerCase()}`}>{q.difficulty}</span>
                      </td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', marginRight: 6 }} onClick={() => openQ(q)}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => deleteQ(q._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CATEGORIES TAB */}
        {tab === 'categories' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h2>Categories / Exams ({categories.length})</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={seedCategories}>Seed Govt Exams</button>
                <button className="btn btn-primary" onClick={() => openCat()}>+ Add Category</button>
              </div>
            </div>
            <p style={{ color: '#666', marginBottom: 12 }}>SSC, Banking, UPSC, Railways, Defence etc.</p>
            {loading ? <p>Loading...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Icon</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c._id}>
                      <td style={{ fontSize: 24 }}>{c.icon}</td>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.description}</td>
                      <td>{c.order}</td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', marginRight: 6 }} onClick={() => openCat(c)}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => deleteCat(c._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SUBJECTS TAB */}
        {tab === 'subjects' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h2>Subjects ({subjects.length})</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={seedSubjects}>Seed Common Subjects</button>
                <button className="btn btn-primary" onClick={() => openSub()}>+ Add Subject</button>
              </div>
            </div>
            {loading ? <p>Loading...</p> : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Icon</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s._id}>
                      <td style={{ fontSize: 22 }}>{s.icon}</td>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.category?.name || '-'}</td>
                      <td>{s.description}</td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', marginRight: 6 }} onClick={() => openSub(s)}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => deleteSub(s._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SYLLABUS TAB */}
        {tab === 'syllabus' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2>Syllabus / Topics ({syllabusList.length})</h2>
              <button className="btn btn-primary" onClick={() => openSyl()}>+ Add Syllabus</button>
            </div>
            {loading ? <p>Loading...</p> : syllabusList.length === 0 ? (
              <div className="empty"><p>No syllabus yet. Add chapters/topics under subjects.</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Topics</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {syllabusList.map(s => (
                    <tr key={s._id}>
                      <td><strong>{s.title}</strong></td>
                      <td>{s.subject?.name || '-'}</td>
                      <td>{s.category?.name || '-'}</td>
                      <td style={{ maxWidth: 200 }}>{(s.topics || []).join(', ') || '-'}</td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', marginRight: 6 }} onClick={() => openSyl(s)}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => deleteSyl(s._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* BANNERS TAB */}
        {tab === 'banners' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h2>Home Slider / Banners ({banners.length})</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={seedBanners}>Seed Default Banners</button>
                <button className="btn btn-primary" onClick={() => openBan()}>+ Add Banner</button>
              </div>
            </div>
            {loading ? <p>Loading...</p> : banners.length === 0 ? (
              <div className="empty"><p>No banners. Add slider images/text for home page.</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subtitle</th>
                    <th>Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map(b => (
                    <tr key={b._id}>
                      <td><strong>{b.title}</strong></td>
                      <td>{b.subtitle}</td>
                      <td>{b.order}</td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', marginRight: 6 }} onClick={() => openBan(b)}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => deleteBan(b._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Category Form */}
            {modalType === 'category' && (
              <form onSubmit={saveCat}>
                <h2>{editing ? 'Edit Category' : 'Add Category (Exam)'}</h2>
                <div className="form-group">
                  <label>Name *</label>
                  <input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required placeholder="e.g. SSC, Banking" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Short description" />
                </div>
                <div className="form-group">
                  <label>Icon (emoji)</label>
                  <input value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Order</label>
                  <input type="number" value={catForm.order} onChange={e => setCatForm({ ...catForm, order: +e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            )}

            {/* Subject Form */}
            {modalType === 'subject' && (
              <form onSubmit={saveSub}>
                <h2>{editing ? 'Edit Subject' : 'Add Subject'}</h2>
                <div className="form-group">
                  <label>Name *</label>
                  <input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} required placeholder="e.g. Quantitative Aptitude" />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={subForm.category} onChange={e => setSubForm({ ...subForm, category: e.target.value })} required>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input value={subForm.description} onChange={e => setSubForm({ ...subForm, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Icon (emoji)</label>
                  <input value={subForm.icon} onChange={e => setSubForm({ ...subForm, icon: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Order</label>
                  <input type="number" value={subForm.order} onChange={e => setSubForm({ ...subForm, order: +e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            )}

            {/* Syllabus Form */}
            {modalType === 'syllabus' && (
              <form onSubmit={saveSyl}>
                <h2>{editing ? 'Edit Syllabus' : 'Add Syllabus / Chapter'}</h2>
                <div className="form-group">
                  <label>Title *</label>
                  <input value={sylForm.title} onChange={e => setSylForm({ ...sylForm, title: e.target.value })} required placeholder="e.g. Number System, Simplification" />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={sylForm.category} onChange={e => setSylForm({ ...sylForm, category: e.target.value, subject: '' })} required>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <select value={sylForm.subject} onChange={e => setSylForm({ ...sylForm, subject: e.target.value })} required>
                    <option value="">Select Subject</option>
                    {sylSubjects.map(s => <option key={s._id} value={s._id}>{s.icon} {s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Topics (comma separated)</label>
                  <input value={sylForm.topics} onChange={e => setSylForm({ ...sylForm, topics: e.target.value })} placeholder="LCM, HCF, Fractions" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={2} value={sylForm.description} onChange={e => setSylForm({ ...sylForm, description: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            )}

            {/* Banner Form */}
            {modalType === 'banner' && (
              <form onSubmit={saveBan}>
                <h2>{editing ? 'Edit Banner' : 'Add Banner / Slider'}</h2>
                <div className="form-group">
                  <label>Title *</label>
                  <input value={banForm.title} onChange={e => setBanForm({ ...banForm, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Subtitle</label>
                  <input value={banForm.subtitle} onChange={e => setBanForm({ ...banForm, subtitle: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Image URL (optional)</label>
                  <input value={banForm.image} onChange={e => setBanForm({ ...banForm, image: e.target.value })} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label>Order</label>
                  <input type="number" value={banForm.order} onChange={e => setBanForm({ ...banForm, order: +e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            )}


            {modalType === 'pdf' && (
              <div>
                <h2>Upload PDF → Auto Questions</h2>
                <p style={{ fontSize: 13, color: '#52796F', marginBottom: 16 }}>
                  PDF me MCQ format: Q1. question... A) ... B) ... Answer: A
                </p>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={pdfCategory} onChange={e => { setPdfCategory(e.target.value); setPdfSubject(''); }} required>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <select value={pdfSubject} onChange={e => setPdfSubject(e.target.value)} required>
                    <option value="">Select Subject</option>
                    {subjects.filter(s => (s.category?._id || s.category) === pdfCategory).map(s => (
                      <option key={s._id} value={s._id}>{s.icon} {s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>PDF File *</label>
                  <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files[0] || null)} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="button" className="btn btn-primary" onClick={uploadPdf} disabled={pdfLoading}>
                    {pdfLoading ? 'Processing...' : 'Upload & Import'}
                  </button>
                  <button type="button" className="btn btn-outline" style={{ color: '#1B4332', borderColor: '#2D6A4F' }} onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Question Form */}
            {modalType === 'question' && (
              <form onSubmit={saveQ}>
                <h2>{editing ? 'Edit Question' : 'Add New Question'}</h2>
                <div className="form-group">
                  <label>Question *</label>
                  <textarea rows={3} value={qForm.question} onChange={e => setQForm({ ...qForm, question: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={qForm.category} onChange={e => setQForm({ ...qForm, category: e.target.value, subject: '', syllabus: '' })} required>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <select value={qForm.subject} onChange={e => setQForm({ ...qForm, subject: e.target.value, syllabus: '' })} required>
                    <option value="">Select Subject</option>
                    {filteredSubjects.map(s => <option key={s._id} value={s._id}>{s.icon} {s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Syllabus / Topic (optional)</label>
                  <select value={qForm.syllabus} onChange={e => setQForm({ ...qForm, syllabus: e.target.value })}>
                    <option value="">None</option>
                    {filteredSyllabus.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Options * (select correct one)</label>
                  {qForm.options.map((opt, i) => (
                    <div className="option-row" key={i}>
                      <input type="radio" name="correct" checked={qForm.correctAnswer === i} onChange={() => setQForm({ ...qForm, correctAnswer: i })} />
                      <input type="text" placeholder={`Option ${i + 1}`} value={opt} onChange={e => handleOptionChange(i, e.target.value)} />
                      {qForm.options.length > 2 && (
                        <button type="button" className="btn btn-danger" style={{ padding: '8px 12px' }} onClick={() => removeOption(i)}>×</button>
                      )}
                    </div>
                  ))}
                  {qForm.options.length < 6 && (
                    <button type="button" className="btn btn-outline" style={{ marginTop: 8 }} onClick={addOption}>+ Add Option</button>
                  )}
                </div>
                <div className="form-group">
                  <label>Difficulty</label>
                  <select value={qForm.difficulty} onChange={e => setQForm({ ...qForm, difficulty: e.target.value })}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Explanation (optional)</label>
                  <textarea rows={2} value={qForm.explanation} onChange={e => setQForm({ ...qForm, explanation: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
