import { Link } from 'react-router-dom';
import useReviews from '../lib/useReviews';
import DiaryReviews from './DiaryReviews';
import SectionHeading from './SectionHeading';

// "What guests say about our food": food reviews only (stay reviews have their own section)
export default function FoodReviews({ perPage = 3 }) {
  const { reviews } = useReviews('food');
  if (!reviews.length) return null;
  return (
    <section className="wrap pb-24">
      <SectionHeading eyebrow="Food reviews" title="What guests say about our food" />
      <div className="mx-auto max-w-4xl"><DiaryReviews reviews={reviews} perPage={perPage} title="Food diary" twoCol={false} /></div>
      <div className="mt-8 text-center"><Link to="/reviews?tab=food" className="bt-line bt-sm">All food reviews</Link></div>
    </section>
  );
}
