import { useState, type FormEvent } from 'react';
import { CheckCircle2, MessageSquareText, Star } from 'lucide-react';
import { api, apiMode } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import type { FeedbackCategory } from '../types';
import { CardBody, CardHeader, GovAlert, GovButton, GovCard } from '../components/GovUI';

const categories: Array<{ value: FeedbackCategory; label: string; target: string }> = [
  { value: 'INSTRUCTOR', label: 'Instructor', target: 'Instructor name' },
  { value: 'SERVICE', label: 'Service', target: 'Service name' },
  { value: 'EQUIPMENT', label: 'Equipment', target: 'Equipment or item name' },
];

export function FeedbackPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>('INSTRUCTOR');
  const [targetName, setTargetName] = useState('');
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const feedbackQuery = useAsync(() => api.feedback.list());
  const selectedCategory = categories.find((item) => item.value === category)!;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice(''); setError('');
    try {
      await api.feedback.submit({ category, target_name: targetName.trim(), rating, comments: comments.trim() });
      setNotice('Thank you. Your feedback has been submitted.');
      setTargetName(''); setRating(0); setComments('');
      feedbackQuery.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Feedback could not be submitted.');
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-8">
      <header className="border-l-4 border-[#0f3460] pl-4 py-1">
        <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-[#6b7c93]">SERVICE QUALITY</p>
        <h1 className="mt-1 text-2xl font-bold text-[#0f2540]">Feedback</h1>
        <p className="mt-1 text-sm text-[#586b80]">Share a rating and specific feedback about an instructor, service, or equipment.</p>
      </header>

      {notice && <GovAlert tone="success"><span className="inline-flex items-center gap-2"><CheckCircle2 size={16} />{notice}</span></GovAlert>}
      {error && <GovAlert tone="error">{error}</GovAlert>}
      {apiMode === 'mock' && <GovAlert tone="demo">Demo feedback is saved in this browser only. Live feedback is associated with your account and can be reviewed by administrators.</GovAlert>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-5 items-start">
        <form onSubmit={handleSubmit}>
        <GovCard>
          <CardHeader title="Submit feedback" subtitle="Your feedback is associated with your signed-in account." />
          <CardBody className="space-y-5">
            <fieldset>
              <legend className="text-xs font-semibold text-[#374151] mb-2">What is your feedback about?</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {categories.map((item) => (
                  <button key={item.value} type="button" aria-pressed={category === item.value} onClick={() => setCategory(item.value)}
                    className={`min-h-11 border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460] ${category === item.value ? 'border-[#0f3460] bg-[#edf4fb] text-[#0f3460]' : 'border-[#d1d5db] bg-white text-[#4b6077] hover:bg-[#f8fafc]'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[#374151]">{selectedCategory.target} <span className="text-red-700" aria-hidden="true">*</span></span>
              <input required maxLength={160} value={targetName} onChange={(event) => setTargetName(event.target.value)} placeholder={`Enter ${selectedCategory.target.toLowerCase()}`}
                className="w-full min-h-11 border border-[#b8c3ce] bg-white px-3 py-2 text-sm text-[#0f2540] placeholder:text-[#8a98a8] focus:outline-none focus:ring-2 focus:ring-[#0f3460]" />
            </label>

            <fieldset>
              <legend className="text-xs font-semibold text-[#374151]">Rating <span className="text-red-700" aria-hidden="true">*</span></legend>
              <div className="mt-1 flex flex-wrap items-center gap-1" role="group" aria-label="Rating from one to five stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" aria-pressed={rating === value} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} onClick={() => setRating(value)}
                    className="min-h-11 min-w-11 p-2 text-[#a16207] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460]">
                    <Star size={22} fill={value <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
                <span className="ml-2 text-xs text-[#586b80]">{rating ? `${rating} of 5` : 'Choose a rating'}</span>
              </div>
            </fieldset>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[#374151]">Comments <span className="text-red-700" aria-hidden="true">*</span></span>
              <textarea required minLength={10} maxLength={2000} rows={5} value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Tell us what worked well or what could be improved…"
                className="w-full resize-y border border-[#b8c3ce] bg-white px-3 py-2.5 text-sm text-[#0f2540] placeholder:text-[#8a98a8] focus:outline-none focus:ring-2 focus:ring-[#0f3460]" />
              <span className="block text-right text-[11px] text-[#6b7c93]">{comments.length}/2000 · At least 10 characters</span>
            </label>

            <GovButton type="submit" variant="primary" disabled={busy || rating === 0}>
              <span className="inline-flex items-center gap-2"><MessageSquareText size={15} />{busy ? 'Submitting…' : 'Submit feedback'}</span>
            </GovButton>
          </CardBody>
        </GovCard>
        </form>

        <GovCard>
          <CardHeader title={user?.role === 'ADMIN' ? 'Feedback inbox' : 'Feedback activity'} subtitle={apiMode === 'mock' ? 'Only visible in this browser' : user?.role === 'ADMIN' ? 'Recent submissions from all portal users' : 'Your submissions'} />
          <CardBody className="p-0">
            {feedbackQuery.loading && <p className="px-5 py-8 text-sm text-[#6b7c93]">Loading feedback…</p>}
            {feedbackQuery.error && <div className="p-4"><GovAlert tone="error">{feedbackQuery.error}</GovAlert></div>}
            {!feedbackQuery.loading && !feedbackQuery.error && (feedbackQuery.data?.length ?? 0) === 0 && <p className="px-5 py-8 text-sm text-[#6b7c93]">Your submitted feedback will appear here.</p>}
            <ul className="divide-y divide-[#e5e7eb]">
              {feedbackQuery.data?.map((item) => (
                <li key={item.feedback_id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#0f2540] break-words">{item.target_name}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#6b7c93]">{item.category.toLowerCase()} · {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#8a5300]" aria-label={`${item.rating} out of 5 stars`}><Star size={14} fill="currentColor" />{item.rating}/5</span>
                  </div>
                  {(apiMode === 'mock' || user?.role === 'ADMIN') && item.submitted_by_name && <p className="mt-2 text-xs font-medium text-[#4b6077]">By {item.submitted_by_name}{item.submitted_by_role ? ` · ${item.submitted_by_role}` : ''}</p>}
                  <p className="mt-2 text-sm leading-relaxed text-[#374151] whitespace-pre-wrap break-words">{item.comments}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </GovCard>
      </div>
    </div>
  );
}
